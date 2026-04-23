/* Top-down adventure sandbox | Version 2025-10-30b */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
const gameWrapper = document.getElementById("gameWrapper");
const touchControlsRoot = document.getElementById("touchControls");
const moveStickBase = document.getElementById("moveStick");
const aimStickBase = document.getElementById("aimStick");
const virtualSpaceButton = document.getElementById("virtualSpaceButton");
const arcControl = document.getElementById("arcControl");

let assets = null;
let player = null;
const enemies = [];
const projectiles = [];
const obstacles = [];
const weaponPickups = [];
const utilityPowerUps = [];
const churchPowerupPickups = [];
const ringOfFireHazards = [];
const prayerStormGroundFires = [];
const gracePickups = [];
const graceHudFlyEffects = [];
const powerupHudFlyEffects = [];
// Helper to read from GameBalance config with fallback
const _gb = (path, fallback) => {
  if (typeof GameBalance === 'undefined') return fallback;
  const parts = path.split('.');
  let val = GameBalance;
  for (const p of parts) {
    if (val && typeof val === 'object' && p in val) val = val[p];
    else return fallback;
  }
  return val !== undefined ? val : fallback;
};

const POWERUP_RESPAWN_DELAY = _gb('powerups.respawnDelay', 5);
const POWERUP_ACTIVE_LIFETIME = _gb('powerups.activeLifetime', 8);
const POWERUP_BLINK_DURATION = _gb('powerups.blinkDuration', 2);
const POWERUP_SPAWN_BLINK_DURATION = _gb('powerups.spawnBlinkDuration', 1.2);
const POWERUP_STAGGER_DELAY = _gb('powerups.staggerDelay', 4);
const POWERUP_REFILL_DELAY = _gb('powerups.refillDelay', 4);
let powerUpRespawnTimer = 0;
let powerUpStaggerTimer = 0;
let churchPowerupEnsureTimer = 0;
let queuedPowerUpDrops = 0;
let powerUpEnsureCycleIndex = 0;
let playerGraceCount = 0;
let maxComboThisTown = 0;
let hudComboDisplay = null;
const unlockedChurchPowerups = new Set();
const churchPowerupLevels = new Map();
const GRACE_PICKUP_RADIUS = _gb('grace.pickupRadius', 18);
const GRACE_PICKUP_FRAME_DURATION = 0.08;
const GRACE_PICKUP_LIFETIME = _gb('grace.lifetime', 15);
const GRACE_PICKUP_ATTRACT_DISTANCE = _gb('grace.attractDistance', 170);
const GRACE_PICKUP_ATTRACT_FORCE = _gb('grace.attractForce', 460);
const GRACE_PICKUP_GRAVITY = _gb('grace.gravity', 520);
const GRACE_PICKUP_AIR_DRAG = _gb('grace.airDrag', 0.88);
const GRACE_PICKUP_FLOOR_Y = () => canvas.height - 36;
const GRACE_DROP_BASE_CHANCE = _gb('grace.dropBaseChance', 0.18);
const GRACE_DROP_HIGH_VALUE_BONUS = _gb('grace.dropHighValueBonus', 0.12);
const GRACE_DROP_MINION_SCALE = _gb('grace.dropMinionScale', 0.35);
const GRACE_DROP_MAX_STACK = _gb('grace.dropMaxStack', 3);
const GRACE_DROP_SIZE_CHANCE_FACTOR = _gb('grace.dropSizeChanceFactor', 0.15);
const GRACE_DROP_SIZE_STACK_FACTOR = _gb('grace.dropSizeStackFactor', 0.9);
const GRACE_RUSH_DURATION = _gb('grace.rushDuration', 8);
const GRACE_BONUS_MULTIPLIER = _gb('grace.bonusMultiplier', 5);
const POST_DEATH_HANG = 5;
const ARENA_FADE_DURATION = 2;
let postDeathSequenceActive = false;
let pendingExteriorShotAfterVisitor = false;
let pendingBossIntroAfterExterior = false;
let mapAmbientFadeQueued = false;
let postDeathTimer = 0;
let miniImpWaveDispatched = false;
let arenaFadeTimer = 0;
let arenaFadeAlpha = 0;
let bossBonusTransitionFadeTimer = 0;
let bossBonusTransitionFadeDuration = 0;
let bossBonusTransitionFadeAlpha = 0;
let actBreakFadeTimer = 0;
let actBreakFadeDuration = 0;
let actBreakFadeAlpha = 0;
const ACT_BREAK_FADE_IN = 0.8;
const ACT_BREAK_FADE_OUT = 0.8;
const ACT_BREAK_HOLD_SECONDS = 2;
let chapterBreakActive = false;
let chapterBreakActNumber = 2;
let chapterBreakImage = null;
let lastCompletedLevel = 0;
let lastSummaryWasLevelEnd = false;
let graceRushFadeTimer = 0;
let graceRushFadeDuration = 0;
let graceRushFadeAlpha = 0;
let graceRushFadeHold = false;
let graceRushFadeReleaseTimer = 0;
let graceRushBlackout = false;
let graceRushHardBlackoutTimer = 0;
let recapIntroFadeTimer = 0;
let recapIntroFadeDuration = 0;
let recapIntroFadeAlpha = 0;
let playerDeathFadeAlpha = 0;
const PLAYER_DEATH_FADE_TARGET = 0.5;
const PLAYER_DEATH_FADE_SPEED = 6;
let damageHitFlash = 0;
let prayerBombRainTimer = 0;
let prayerBombRainSpawnTimer = 0;
let prayerBombScreenFadeTimer = 0;
let prayerBombScreenFadeDuration = 0.8;
let prayerStormGroundFireTargetThisCast = 0;
let prayerStormGroundFireSpawnedThisCast = 0;
let prayerStormRainImpactCountThisCast = 0;
let prayerStormGroundFireNextSpawnAtImpact = Infinity;
let prayerStormGroundFireImpactSpacing = Infinity;
const prayerBombComboState = {
  active: false,
  hits: 0,
  label: null,
  anchorX: null,
  anchorY: null,
};
const DAMAGE_HIT_FLASH_DURATION = 0.08;
if (typeof window !== "undefined" && !window.triggerDamageFlash) {
  window.triggerDamageFlash = () => {
    damageHitFlash = DAMAGE_HIT_FLASH_DURATION;
  };
}
const npcs = [];
const effects = Effects.getActive();
let divineChargeSparkEffect = null;
let divineChargeFlashEffect = null;
let prayerBombReadyEffect = null;
let divineChargeFlashFrames = null;
let playerDashState = {
  isDashing: false,
  dashDir: { x: 0, y: 0 },
  dashDistanceRemaining: 0,
  dashDustAccumulator: 0,
  pendingDashTimer: 0,
  pendingDashDir: { x: 1, y: 0 },
  dashCooldown: 0,
};
let ashOverlay = null;
let fireOverlay = null;
let pendingTownIntroStart = false;
let townIntroDismissedAt = 0;
const TOWN_INTRO_ZOOM_DURATION = 1.0;
const TOWN_INTRO_FADE_DURATION = 2.0;
let townIntroTransitionActive = false;
let townIntroTransitionTimer = 0;
let townVisitorMinigamePlayed = false;
let suppressInitialAnnouncements = false;
const levelAnnouncements = [];
let levelManager = null;
let activeBoss = null;
const bossHazards = [];
let titleScreenActive = true;
let titleDemoSaveMenuActive = false;
let titleDemoSaveOverride = null;
let demoSandboxRunActive = false;
let titleCloudSaveLoading = false;
let titleCloudSaveRows = [];
let titleCloudActiveSaveId = null;
let titleCloudSelectedSaveId = null;
const TITLE_DEMO_SAVE_SLOTS = [
  {
    key: "slot1",
    label: "Demo: New Playthrough",
    townId: "pine_hollow",
    completedTowns: 0,
    campaignData: {
      campaign: "p1",
      startCount: 50,
      campaignMultiplier: 1.0,
      restoredChurchPowerupLevels: {},
    },
  },
  {
    key: "slot2",
    label: "Demo: Area 1 Cleared",
    townId: "red_creek",
    completedTowns: 3,
    campaignData: {
      campaign: "p1",
      startCount: 85,
      campaignMultiplier: 1.0,
      restoredChurchPowerupLevels: {},
    },
  },
  {
    key: "slot3",
    label: "Demo: Area 2 Cleared",
    townId: "lowmoor",
    completedTowns: 6,
    campaignData: {
      campaign: "p2",
      startCount: 120,
      campaignMultiplier: 1.15,
      restoredChurchPowerupLevels: {
        spreadGun: 5,
        halo: 5,
      },
    },
  },
];

function setDemoSandboxRunActive(active) {
  demoSandboxRunActive = Boolean(active);
  if (!demoSandboxRunActive && typeof window !== "undefined" && typeof window.MapScreen?.clearDemoProfile === "function") {
    window.MapScreen.clearDemoProfile();
  }
  if (typeof window !== "undefined") {
    window.__demoSandboxRunActive = demoSandboxRunActive;
  }
}
setDemoSandboxRunActive(false);
let assetsLoaded = false;
let mapReady = false; // True when title/map can be used (before full gameplay assets)
let gameplayAssetsPromise = null; // Promise for background gameplay asset loading
let loadingProgress = 0; // 0-100
const devStatus = { text: "", timer: 0 };
const weaponPickupAnnouncement = {
  title: "",
  description: "",
  color: "#EAF6FF",
  timer: 0,
  duration: 0,
};
let evacuatedNpcCount = 0;
let npcsSuspended = false;
const congregationMembers = [];
let congregationWanderBounds = null;
let npcProcessionActive = false;
let powerUpsClearedForCongregation = false;
let congregationGreetingShown = false;
let congregationWelcomeTimer = 0;
let congregationGreetingCount = 0;
let congregationTutorialPrayerInit = false;
let congregationDialogueIndex = 0;
const congregationWaveIntroDialogueState = {
  activeKey: "",
  queue: [],
  firstResponder: null,
};
const battleVictoryDialogueState = {
  queue: [],
};
let sentryOrbitAngle = 0;
const CONGREGATION_MEMBER_RADIUS = 26;
const CONGREGATION_MEMBER_COUNT = 50;
const INITIAL_CONGREGATION_SIZE = CONGREGATION_MEMBER_COUNT;
const CONGREGATION_DIALOGUE_COOLDOWN_MS = 4500;
const CONGREGATION_DIALOGUE_DATA =
  (typeof window !== "undefined" && window.BattlechurchCongregationDialogue) || {};
const CONGREGATION_DIALOGUE_LINES =
  CONGREGATION_DIALOGUE_DATA.lines || [];
const CONGREGATION_WAVE_INTRO_DIALOGUE = CONGREGATION_DIALOGUE_DATA.waveIntro || {};
const CONGREGATION_WAVE_END_DIALOGUE = CONGREGATION_DIALOGUE_DATA.waveEnd || {};
const CONGREGATION_RED_FAITH_DIALOGUE = CONGREGATION_DIALOGUE_DATA.redFaith || {};
const CONGREGATION_NPC_POWERUP_DIALOGUE = CONGREGATION_DIALOGUE_DATA.npcPowerups || {};
const CONGREGATION_BATTLE_VICTORY_DIALOGUE = CONGREGATION_DIALOGUE_DATA.battleVictory || {};
const CONGREGATION_WELCOME_LINES = CONGREGATION_DIALOGUE_DATA.welcomeLines || [];
const CONGREGATION_WELCOME_LINES_XBOX = CONGREGATION_DIALOGUE_DATA.welcomeLinesXbox || [];
const MAX_CONGREGATION_WELCOME_HINTS = 11;

function getActiveCongregationWelcomeLines() {
  const gamepadConnected = Boolean(window?.Input?.gamepadState?.connected);
  if (gamepadConnected && Array.isArray(CONGREGATION_WELCOME_LINES_XBOX) && CONGREGATION_WELCOME_LINES_XBOX.length) {
    return CONGREGATION_WELCOME_LINES_XBOX;
  }
  return CONGREGATION_WELCOME_LINES;
}
const NPC_PROCESSION_SPEED_MULTIPLIER = 3.5;
let congregationSize = INITIAL_CONGREGATION_SIZE;
let townStartCongregation = INITIAL_CONGREGATION_SIZE;
const NPC_PROCESSION_ENTRY_MARGIN = 220;
const VISITOR_GUEST_COUNT = 10;
const VISITOR_SESSION_DURATION = 30;
const VISITOR_GUEST_MAX_FAITH = 10;
const VISITOR_BLOCKER_HITS_REQUIRED = 5;
const HEART_FAITH_PER_HIT = 1;
const VISITOR_BLOCKER_LINES =
  (typeof window !== "undefined" &&
    window.BattlechurchVisitorBlocker &&
    window.BattlechurchVisitorBlocker.blockerLines) ||
  [];
const ITEM_SPRITE_ROOT = "assets/sprites/items/icons";
const TORCH_SPRITE_FILE = `${ITEM_SPRITE_ROOT}/I43_Torch.png`;
const FLAG_SPRITE_FILE = `${ITEM_SPRITE_ROOT}/I28_Idol.png`;
const DEFAULT_ARROW_SFX_SRC = "assets/sfx/rpg/Magic/fireball_release_3.wav";
const ENEMY_HIT_SFX_SRCS = [
  "assets/sfx/rpg/Impacts/impact_5.wav",
  "assets/sfx/rpg/Impacts/impact_6.wav",
  "assets/sfx/rpg/Impacts/impact_7.wav",
  "assets/sfx/rpg/Impacts/impact_8.wav",
];
const ENEMY_DEATH_MONSTER_SRCS = [
  "assets/sfx/rpg/Monsters/monster_5.wav",
  "assets/sfx/rpg/Monsters/monster_6.wav",
  "assets/sfx/rpg/Monsters/monster_7.wav",
  "assets/sfx/rpg/Monsters/monster_8.wav",
  "assets/sfx/rpg/Monsters/monster_9.wav",
];
const ENEMY_DEATH_GRUNT_SRCS = [
  "assets/sfx/rpg/Battle Grunts/Battle_grunt_13.wav",
  "assets/sfx/rpg/Battle Grunts/Battle_grunt_14.wav",
  "assets/sfx/rpg/Battle Grunts/Battle_grunt_15.wav",
  "assets/sfx/rpg/Battle Grunts/Battle_grunt_16.wav",
  "assets/sfx/rpg/Battle Grunts/Battle_grunt_17.wav",
  "assets/sfx/rpg/Battle Grunts/Battle_grunt_18.wav",
  "assets/sfx/rpg/Battle Grunts/Battle_grunt_19.wav",
  "assets/sfx/rpg/Battle Grunts/Battle_grunt_20.wav",
  "assets/sfx/rpg/Battle Grunts/Battle_grunt_21.wav",
];
const ENEMY_DEATH_SFX_SRCS = [
  ...ENEMY_DEATH_MONSTER_SRCS,
  ...ENEMY_DEATH_GRUNT_SRCS,
];
const SWORD_SWING_SFX_SRC = "assets/sfx/Weapons/attack10.mp3";
const RUSH_ATTACK_SFX_SRC = "assets/sfx/Weapons/spell3.mp3";
const DASH_SFX_SRC = "assets/sfx/Weapons/attack10.mp3";
const SWORD_KILL_SFX_SRCS = [
  "assets/sfx/rpg/Impacts/impact_5.wav",
  "assets/sfx/rpg/Impacts/impact_6.wav",
  "assets/sfx/rpg/Impacts/impact_7.wav",
  "assets/sfx/rpg/Impacts/impact_8.wav",
];
const FIREBALL_CAST_SFX_SRCS = [
  "assets/sfx/Weapons/spell2.mp3",
  "assets/sfx/Weapons/spell3.mp3",
];
const WISDOM_CAST_SFX_SRCS = [
  "assets/sfx/rpg/Magic/fireball_whoosh_01.wav",
  "assets/sfx/rpg/Magic/fireball_whoosh_02.wav",
  "assets/sfx/rpg/Magic/fireball_whoosh_03.wav",
];
const WISDOM_HIT_SFX_SRCS = [
  "assets/sfx/rpg/Explosions/Explosions_38.wav",
  "assets/sfx/rpg/Explosions/Explosions_39.wav",
  "assets/sfx/rpg/Explosions/Explosions_40.wav",
];
const PRAYER_BOMB_RAIN_SFX_SRCS = [
  "assets/sfx/rpg/Explosions/Explosions_38.wav",
  "assets/sfx/rpg/Explosions/Explosions_39.wav",
  "assets/sfx/rpg/Explosions/Explosions_40.wav",
];
const FAITH_CANNON_SFX_SRCS = [
  "assets/sfx/rpg/Magic/fireball_whoosh_04.wav",
  "assets/sfx/rpg/Magic/fireball_whoosh_05.wav",
  "assets/sfx/rpg/Magic/fireball_whoosh_06.wav",
];
const RECAP_GRACE_FLY_SFX_SRC = "assets/sfx/rpg/Magic/fireball_whoosh_05.wav";
const FAITH_HIT_SFX_SRCS = [
  "assets/sfx/rpg/Explosions/Explosions_22.wav",
  "assets/sfx/rpg/Explosions/Explosions_23.wav",
  "assets/sfx/rpg/Explosions/Explosions_24.wav",
];
const SENTRY_BEAM_SFX_SRCS = [
  "assets/sfx/Weapons/spell11.mp3",
  "assets/sfx/Weapons/spell12.mp3",
];
const SENTRY_BORE_LOOP_SFX_SRCS = [
  "assets/sfx/Weapons/spell2.mp3",
  "assets/sfx/Weapons/spell3.mp3",
  "assets/sfx/Weapons/spell10.mp3",
];
const SPEAR_TURN_SFX_SRCS = [
  "assets/sfx/Weapons/spell2.mp3",
  "assets/sfx/Weapons/spell3.mp3",
  "assets/sfx/Weapons/spell11.mp3",
  "assets/sfx/Weapons/spell12.mp3",
];
const SPEAR_HIT_SFX_SRCS = [
  "assets/sfx/rpg/Explosions/Explosions_22.wav",
  "assets/sfx/rpg/Explosions/Explosions_23.wav",
  "assets/sfx/rpg/Explosions/Explosions_24.wav",
];
const SENTRY_BORE_KILL_SFX_SRC = "assets/sfx/rpg/Explosions/Explosions_22.wav";
const PRAYER_BOMB_SFX_SRC = "assets/sfx/rpg/Explosions/Explosions_8.wav";
const BOSS_DEATH_EXPLOSION_SFX_SRCS = [
  "assets/sfx/rpg/Explosions/Explosions_8.wav",
  "assets/sfx/rpg/Explosions/Explosions_40.wav",
  "assets/sfx/rpg/Explosions/Explosions_24.wav",
];
const BOSS_LIGHTNING_THUNDER_SFX_SRCS = [
  "assets/sfx/rpg/Explosions/Explosions_8.wav",
  "assets/sfx/rpg/Explosions/Explosions_40.wav",
];
const BOSS_DEATH_EXPLOSION_SFX_POOL_SIZE = 6;
const POWERUP_PICKUP_SFX_SRC = "assets/sfx/utility/utility16.mp3";
const GRACE_PICKUP_SFX_SRC = "assets/sfx/utility/utility10.mp3";
const RECAP_TICK_SFX_SRC = "assets/sfx/utility/utility9.mp3";
const RECAP_FINAL_SFX_SRC = "assets/sfx/rpg/Explosions/Explosions_22.wav";
const INTRO_MUSIC_SRC = "assets/music/title-music.mp3";
const BATTLE_MUSIC_SRC = "assets/music/battle-music.mp3";
const WAVE3_BATTLE_MUSIC_SRC = "assets/music/boss-fight-4.mp3";
const BOSS_PHASE3_MUSIC_SRC = "assets/music/boss-fight-1.mp3";
const RECAP_MUSIC_SRC = "assets/music/town-cleared-music.mp3";
const VISITOR_MUSIC_SRC = "assets/music/visitor-music-2.mp3";
const EXTERIOR_MUSIC_SRC = "assets/music/boss-fight-1.mp3";
const EXTERIOR_BOSS_MUSIC_SRC = "assets/music/boss-fight-3.mp3";
const BOSS_DEATH_MUSIC_SRC = "assets/music/boss-fight-2.mp3";
const MENU_SELECT_SFX_SRC = "assets/sfx/rpg/Explosions/Explosions_22.wav";
const MENU_MOVE_SFX_SRC = "assets/sfx/utility/cursor_5.mp3";
const ENEMY_SPAWN_SFX_SRC = "assets/sfx/rpg/Monsters/monster_1.wav";
const VISITOR_HIT_SFX_SRC = "assets/sfx/npcs/fireball_release_1.wav";
const CHATTY_HIT_SFX_SRC = "assets/sfx/utility/utility3.mp3";
const VISITOR_SAVED_SFX_SRC = "assets/sfx/npcs/healing_spell_2.wav";
const NPC_HURT_SFX_SRC = "assets/sfx/npcs/ow1.wav";
const PLAYER_HURT_SFX_SRC = "assets/sfx/rpg/player/ouch_voice.wav";
const PLAYER_DEATH_BELL_SFX_SRC = "assets/sfx/rpg/player/bells-2.wav";
const HIGH_HEALTH_DEATH_GRUNT_SRC = "assets/sfx/rpg/Battle Grunts/Battle_grunt_9.wav";
const DIVINE_SHOT_SFX_SRC = "assets/sfx/Weapons/spell11.mp3";
const WAVE_TRANSITION_SFX_SRC = "assets/sfx/Weapons/spell3.mp3";
const CONGREGATION_OVERLAY_WORD_SFX_SRC = "assets/sfx/rpg/Explosions/Explosions_24.wav";
const CONGREGATION_OVERLAY_FINAL_SFX_SRC = "assets/sfx/rpg/Explosions/Explosions_8.wav";
const CONGREGATION_FIGHT_SFX_SRC = "assets/sfx/rpg/Explosions/Explosions_40.wav";
const CONGREGATION_COUNT_POP_UP_SFX_SRC = "assets/sfx/rpg/Explosions/Explosions_24.wav";
const CONGREGATION_COUNT_POP_DOWN_SFX_SRC = "assets/sfx/utility/utility3.mp3";
const ENEMY_SPAWN_HIGH_SFX = [
  { minHealth: 500, src: "assets/sfx/rpg/Monsters/monster_12.wav" },
  { minHealth: 400, src: "assets/sfx/rpg/Monsters/monster_11.wav" },
  { minHealth: 300, src: "assets/sfx/rpg/Monsters/monster_10.wav" },
];
const ARROW_SFX_POOL_SIZE = 6;
const ENEMY_HIT_SFX_POOL_SIZE = 8;
const ENEMY_DEATH_SFX_POOL_SIZE = 6;
const SWORD_SFX_POOL_SIZE = 4;
const RUSH_ATTACK_SFX_POOL_SIZE = 2;
const DASH_SFX_POOL_SIZE = 2;
const SWORD_KILL_SFX_POOL_SIZE = 6;
const FIREBALL_SFX_POOL_SIZE = 6;
const WISDOM_SFX_POOL_SIZE = 4;
const FAITH_CANNON_SFX_POOL_SIZE = 4;
const POWERUP_PICKUP_SFX_POOL_SIZE = 4;
const WISDOM_HIT_SFX_POOL_SIZE = 5;
const FAITH_HIT_SFX_POOL_SIZE = 5;
const PRAYER_BOMB_SFX_POOL_SIZE = 4;
const PRAYER_BOMB_RAIN_SFX_POOL_SIZE = 4;
const MENU_SELECT_SFX_POOL_SIZE = 4;
const ENEMY_SPAWN_SFX_POOL_SIZE = 4;
const GRACE_PICKUP_SFX_POOL_SIZE = 4;
const RECAP_TICK_SFX_POOL_SIZE = 6;
const RECAP_FINAL_SFX_POOL_SIZE = 3;
const RECAP_GRACE_FLY_SFX_POOL_SIZE = 6;
const VISITOR_HIT_SFX_POOL_SIZE = 4;
const CHATTY_HIT_SFX_POOL_SIZE = 4;
const VISITOR_SAVED_SFX_POOL_SIZE = 4;
const NPC_HURT_SFX_POOL_SIZE = 4;
const PLAYER_HURT_SFX_POOL_SIZE = 4;
const WAVE_TRANSITION_SFX_POOL_SIZE = 3;
const CONGREGATION_OVERLAY_SFX_POOL_SIZE = 4;
const CONGREGATION_FIGHT_SFX_POOL_SIZE = 3;
const CONGREGATION_COUNT_POP_SFX_POOL_SIZE = 3;
const SENTRY_BEAM_SFX_POOL_SIZE = 3;
const SENTRY_BORE_LOOP_SFX_POOL_SIZE = 4;
const SPEAR_TURN_SFX_POOL_SIZE = 4;
const SPEAR_HIT_SFX_POOL_SIZE = 4;
const BOSS_LIGHTNING_THUNDER_SFX_POOL_SIZE = 4;
const PLAYER_DEATH_BELL_FADE_DELAY = 7;
const PLAYER_DEATH_BELL_FADE_DURATION = 1.2;
const MUSIC_VOLUME_INTRO = 0.65;
const MUSIC_VOLUME_BATTLE = 0.7;
const AUDIO_SETTINGS_STORAGE_KEY = "battlechurch_audio_settings";
const DEFAULT_AUDIO_SETTINGS = {
  musicEnabled: true,
  musicVolume: 1,
  sfxEnabled: true,
  sfxVolume: 1,
};
let audioSettings = { ...DEFAULT_AUDIO_SETTINGS };
const MUSIC_FADE_OUT_MS = 1200;
const MUSIC_FADE_FAST_MS = 450;
const arrowSfxPool = [];
const enemyHitSfxPool = [];
const enemyDeathSfxPool = [];
const enemyDeathGruntChannel =
  typeof Audio !== "undefined" ? new Audio() : null;
const swordSfxPool = [];
const rushAttackSfxPool = [];
const dashSfxPool = [];
const swordKillSfxPool = [];
const fireballSfxPool = [];
const wisdomSfxPool = [];
const faithCannonSfxPool = [];
const powerupPickupSfxPool = [];
const wisdomHitSfxPool = [];
const faithHitSfxPool = [];
const prayerBombSfxPool = [];
const prayerBombRainSfxPool = [];
const bossDeathExplosionSfxPool = [];
const menuSelectSfxPool = [];
const menuMoveSfxPool = [];
const enemySpawnSfxPool = [];
const gracePickupSfxPool = [];
const recapTickSfxPool = [];
const recapFinalSfxPool = [];
const recapGraceFlySfxPool = [];
const visitorHitSfxPool = [];
const chattyHitSfxPool = [];
const visitorSavedSfxPool = [];
const npcHurtSfxPool = [];
const playerHurtSfxPool = [];
const waveTransitionSfxPool = [];
const congregationOverlaySfxPool = [];
const congregationFightSfxPool = [];
const congregationCountPopUpSfxPool = [];
const congregationCountPopDownSfxPool = [];
const sentryBeamSfxPool = [];
const sentryBoreLoopSfxPool = [];
const sentryBoreKillSfxPool = [];
const spearTurnSfxPool = [];
const spearHitSfxPool = [];
const bossLightningThunderSfxPool = [];
const playerDeathBellAudio = typeof Audio !== "undefined" ? new Audio(PLAYER_DEATH_BELL_SFX_SRC) : null;
let playerDeathBellFadeTimer = 0;
let playerDeathBellFadeVolume = 1;
let playerDeathBellResume = null;
let playerDeathBellActive = false;
if (playerDeathBellAudio) {
  playerDeathBellAudio.preload = "auto";
  playerDeathBellAudio.volume = 1;
}
const musicState = {
  intro: typeof Audio !== "undefined" ? new Audio(INTRO_MUSIC_SRC) : null,
  battle: typeof Audio !== "undefined" ? new Audio(BATTLE_MUSIC_SRC) : null,
  battleWave3: typeof Audio !== "undefined" ? new Audio(WAVE3_BATTLE_MUSIC_SRC) : null,
  battleBossPhase3: typeof Audio !== "undefined" ? new Audio(BOSS_PHASE3_MUSIC_SRC) : null,
  recap: typeof Audio !== "undefined" ? new Audio(RECAP_MUSIC_SRC) : null,
  visitor: typeof Audio !== "undefined" ? new Audio(VISITOR_MUSIC_SRC) : null,
  exterior: typeof Audio !== "undefined" ? new Audio(EXTERIOR_MUSIC_SRC) : null,
  exteriorBoss: typeof Audio !== "undefined" ? new Audio(EXTERIOR_BOSS_MUSIC_SRC) : null,
  bossDeath: typeof Audio !== "undefined" ? new Audio(BOSS_DEATH_MUSIC_SRC) : null,
  introStarted: false,
  battleStarted: false,
  recapStarted: false,
  visitorStarted: false,
  exteriorStarted: false,
  exteriorBossStarted: false,
  bossDeathStarted: false,
  introStopped: false,
  battleStopped: false,
  recapStopped: false,
  visitorStopped: false,
  exteriorStopped: false,
  exteriorBossStopped: false,
  bossDeathStopped: false,
  exteriorKind: "normal",
  battleTrack: "base",
  battlePrimed: false,
  awaitingUserGesture: false,
  unlocked: false,
  fadeHandles: new Map(),
};
if (musicState.intro) musicState.intro.preload = "auto";
if (musicState.battle) {
  musicState.battle.preload = "auto";
  musicState.battle.loop = true;
}
if (musicState.battleWave3) {
  musicState.battleWave3.preload = "auto";
  musicState.battleWave3.loop = true;
}
if (musicState.battleBossPhase3) {
  musicState.battleBossPhase3.preload = "auto";
  musicState.battleBossPhase3.loop = true;
}
if (musicState.recap) {
  musicState.recap.preload = "auto";
  musicState.recap.loop = false;
}
if (musicState.visitor) {
  musicState.visitor.preload = "auto";
  musicState.visitor.loop = true;
}
if (musicState.exterior) {
  musicState.exterior.preload = "auto";
  musicState.exterior.loop = false;
}
if (musicState.exteriorBoss) {
  musicState.exteriorBoss.preload = "auto";
  musicState.exteriorBoss.loop = false;
}
if (musicState.bossDeath) {
  musicState.bossDeath.preload = "auto";
  musicState.bossDeath.loop = false;
}

const clamp01 = (value) => Math.max(0, Math.min(1, value));

function loadAudioSettings() {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return;
    audioSettings = {
      ...DEFAULT_AUDIO_SETTINGS,
      ...parsed,
    };
    audioSettings.musicVolume = clamp01(audioSettings.musicVolume);
    audioSettings.sfxVolume = clamp01(audioSettings.sfxVolume);
  } catch (e) {}
}

function formatNumberWithCommas(value) {
  const number = Number.isFinite(value) ? Math.round(value) : 0;
  const sign = number < 0 ? "-" : "";
  const digits = String(Math.abs(number));
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${grouped}`;
}

function saveAudioSettings() {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify(audioSettings));
  } catch (e) {}
}

function getEffectiveSfxVolume(volume) {
  if (!audioSettings.sfxEnabled) return 0;
  return clamp01((Number.isFinite(volume) ? volume : 1) * audioSettings.sfxVolume);
}

if (typeof window !== "undefined") {
  window.getEffectiveSfxVolume = getEffectiveSfxVolume;
  window.isSfxEnabled = () => Boolean(audioSettings.sfxEnabled);
}

function getEffectiveMusicVolume(volume) {
  if (!audioSettings.musicEnabled) return 0;
  return clamp01((Number.isFinite(volume) ? volume : 1) * audioSettings.musicVolume);
}

function getBattleTrackAudio(track = musicState.battleTrack) {
  if (track === "wave3") return musicState.battleWave3;
  if (track === "bossPhase3") return musicState.battleBossPhase3;
  return musicState.battle;
}

function getCurrentBattleAudio() {
  return getBattleTrackAudio(musicState.battleTrack);
}

function getDesiredBattleTrack(levelStatus) {
  const stage = levelStatus?.stage || "";
  const bossStage = stage === "bossIntro" || stage === "bossActive";
  if (bossStage) {
    const bossPhase = Math.max(0, Number(levelStatus?.bossPhase) || 0);
    return bossPhase >= 3 ? "bossPhase3" : "wave3";
  }
  const waveNum = Math.max(0, Number(levelStatus?.waveNum) || 0);
  return waveNum >= 3 ? "wave3" : "base";
}

function refreshMusicPlayback() {
  if (!musicState.unlocked) return;
  if (!audioSettings.musicEnabled) {
    pauseAllMusic();
    return;
  }
  const tracks = [
    { audio: musicState.intro, started: musicState.introStarted, stopped: musicState.introStopped, volume: MUSIC_VOLUME_INTRO },
    {
      audio: musicState.battle,
      started: musicState.battleStarted && musicState.battleTrack === "base",
      stopped: musicState.battleStopped,
      volume: MUSIC_VOLUME_BATTLE,
    },
    {
      audio: musicState.battleWave3,
      started: musicState.battleStarted && musicState.battleTrack === "wave3",
      stopped: musicState.battleStopped,
      volume: MUSIC_VOLUME_BATTLE,
    },
    {
      audio: musicState.battleBossPhase3,
      started: musicState.battleStarted && musicState.battleTrack === "bossPhase3",
      stopped: musicState.battleStopped,
      volume: MUSIC_VOLUME_BATTLE,
    },
    { audio: musicState.recap, started: musicState.recapStarted, stopped: musicState.recapStopped, volume: MUSIC_VOLUME_BATTLE },
    { audio: musicState.visitor, started: musicState.visitorStarted, stopped: musicState.visitorStopped, volume: MUSIC_VOLUME_BATTLE },
    { audio: musicState.exterior, started: musicState.exteriorStarted, stopped: musicState.exteriorStopped, volume: MUSIC_VOLUME_INTRO },
    { audio: musicState.exteriorBoss, started: musicState.exteriorBossStarted, stopped: musicState.exteriorBossStopped, volume: MUSIC_VOLUME_INTRO },
    { audio: musicState.bossDeath, started: musicState.bossDeathStarted, stopped: musicState.bossDeathStopped, volume: MUSIC_VOLUME_BATTLE },
  ];
  tracks.forEach((track) => {
    if (!track.audio) return;
    const effective = getEffectiveMusicVolume(track.volume);
    track.audio.volume = effective;
    if (track.started && !track.stopped && track.audio.paused && effective > 0) {
      playMusic(track.audio, { volume: track.volume, loop: track.audio.loop });
    }
  });
}

function applyAudioSettings() {
  refreshMusicPlayback();
  if (playerDeathBellAudio) {
    playerDeathBellAudio.volume = getEffectiveSfxVolume(1);
  }
}

loadAudioSettings();
applyAudioSettings();

function playDefaultArrowSfx(volume = 0.6) {
  return;
}

if (typeof window !== "undefined") {
  window.playDefaultArrowSfx = playDefaultArrowSfx;
}
if (typeof window !== "undefined") {
  window.formatNumberWithCommas = formatNumberWithCommas;
}

/**
 * Play audio from a pool with automatic management
 * @param {Array} pool - The audio pool array to manage
 * @param {string|string[]} src - Audio source path(s). If array, picks randomly
 * @param {number} maxPoolSize - Maximum number of Audio instances in pool
 * @param {Object} options - Playback options
 * @param {number} options.volume - Volume (0-1), default 1.0
 * @param {number} options.playbackRate - Playback speed, default 1.0
 * @param {boolean} options.matchSrc - If true, only reuse audio with matching src
 * @returns {Audio|null} The audio element played, or null if failed
 */
function playPooledSfx(pool, src, maxPoolSize, options = {}) {
  const {
    volume = 1.0,
    playbackRate = 1.0,
    matchSrc = false
  } = options;

  if (typeof Audio === "undefined") return null;
  const effectiveVolume = getEffectiveSfxVolume(volume);
  if (effectiveVolume <= 0) return null;

  // Handle random source selection from array
  const selectedSrc = Array.isArray(src)
    ? src[Math.floor(Math.random() * src.length)]
    : src;

  // Find available audio element
  let audio = null;
  if (matchSrc) {
    // Only reuse audio with matching source
    audio = pool.find(
      (entry) => entry.src && entry.src.includes(selectedSrc) && (entry.paused || entry.ended)
    );
  } else {
    // Reuse any available audio
    audio = pool.find((entry) => entry.paused || entry.ended);
  }

  if (!audio) {
    // Create new audio if pool not full
    if (pool.length < maxPoolSize) {
      audio = new Audio(selectedSrc);
      audio.preload = "auto";
      pool.push(audio);
    } else {
      // Reuse oldest audio from pool
      audio = pool[0];
      if (audio.src !== selectedSrc) {
        audio.src = selectedSrc;
      }
    }
  }

  try {
    audio.currentTime = 0;
    audio.volume = Math.max(0, Math.min(1, effectiveVolume));
    audio.playbackRate = playbackRate;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
    return audio;
  } catch (err) {
    return null;
  }
}

function playEnemyHitSfx(volume = 1) {
  playPooledSfx(enemyHitSfxPool, ENEMY_HIT_SFX_SRCS, ENEMY_HIT_SFX_POOL_SIZE, { volume, matchSrc: true });
}

function playSentryBoreKillSfx(volume = 0.75) {
  playPooledSfx(sentryBoreKillSfxPool, SENTRY_BORE_KILL_SFX_SRC, 2, { volume, matchSrc: true });
}

function playSentryBeamSfx(volume = 0.55) {
  playPooledSfx(
    sentryBeamSfxPool,
    SENTRY_BEAM_SFX_SRCS,
    SENTRY_BEAM_SFX_POOL_SIZE,
    { volume, matchSrc: true },
  );
}

function playSentryBoreLoopSfx(volume = 0.55) {
  playPooledSfx(
    sentryBoreLoopSfxPool,
    SENTRY_BORE_LOOP_SFX_SRCS,
    SENTRY_BORE_LOOP_SFX_POOL_SIZE,
    { volume, matchSrc: true },
  );
}

function playSpearTurnSfx(volume = 0.6) {
  playPooledSfx(
    spearTurnSfxPool,
    SPEAR_TURN_SFX_SRCS,
    SPEAR_TURN_SFX_POOL_SIZE,
    { volume, matchSrc: true },
  );
}

function playSpearHitSfx(volume = 0.75) {
  playPooledSfx(
    spearHitSfxPool,
    SPEAR_HIT_SFX_SRCS,
    SPEAR_HIT_SFX_POOL_SIZE,
    { volume, matchSrc: true },
  );
}

function playBossLightningThunderSfx(volume = 0.5) {
  playPooledSfx(
    bossLightningThunderSfxPool,
    BOSS_LIGHTNING_THUNDER_SFX_SRCS,
    BOSS_LIGHTNING_THUNDER_SFX_POOL_SIZE,
    { volume, matchSrc: true },
  );
}

if (typeof window !== "undefined") {
  window.playEnemyHitSfx = playEnemyHitSfx;
}

function playHighHealthEnemyDeathSfx(volume = 1.0) {
  if (typeof Audio === "undefined") return;
  const effectiveVolume = getEffectiveSfxVolume(volume);
  if (effectiveVolume <= 0) return;
  const channel = enemyDeathGruntChannel;
  if (channel && !channel.paused && !channel.ended) return;
  const audio = channel || new Audio();
  try {
    audio.src = HIGH_HEALTH_DEATH_GRUNT_SRC;
    audio.currentTime = 0;
    audio.volume = effectiveVolume;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  } catch (err) {}
}

if (typeof window !== "undefined") {
  window.playHighHealthEnemyDeathSfx = playHighHealthEnemyDeathSfx;
}

function playNpcHurtSfx(volume = 0.6) {
  playPooledSfx(npcHurtSfxPool, NPC_HURT_SFX_SRC, NPC_HURT_SFX_POOL_SIZE, { volume });
}

if (typeof window !== "undefined") {
  window.playNpcHurtSfx = playNpcHurtSfx;
}

function playPlayerHurtSfx(volume = 1.0) {
  playPooledSfx(playerHurtSfxPool, PLAYER_HURT_SFX_SRC, PLAYER_HURT_SFX_POOL_SIZE, { volume });
}

if (typeof window !== "undefined") {
  window.playPlayerHurtSfx = playPlayerHurtSfx;
}

function playPrayerBombSfx(volume = 0.7) {
  playPooledSfx(prayerBombSfxPool, PRAYER_BOMB_SFX_SRC, PRAYER_BOMB_SFX_POOL_SIZE, { volume });
}

if (typeof window !== "undefined") {
  window.playPrayerBombSfx = playPrayerBombSfx;
}

function playPrayerBombRainSfx(volume = 0.6) {
  playPooledSfx(prayerBombRainSfxPool, PRAYER_BOMB_RAIN_SFX_SRCS, PRAYER_BOMB_RAIN_SFX_POOL_SIZE, { volume, matchSrc: true });
}

if (typeof window !== "undefined") {
  window.playPrayerBombRainSfx = playPrayerBombRainSfx;
}

function playPlayerDeathBell(volume = 1.0) {
  if (!playerDeathBellAudio) return;
  const effectiveVolume = getEffectiveSfxVolume(volume);
  const activeBattleAudio = getCurrentBattleAudio();
  playerDeathBellResume = {
    intro: Boolean(musicState.intro && !musicState.intro.paused && !musicState.introStopped),
    battle: Boolean(activeBattleAudio && !activeBattleAudio.paused && !musicState.battleStopped),
    recap: Boolean(musicState.recap && !musicState.recap.paused && !musicState.recapStopped),
  };
  playerDeathBellActive = true;
  pauseAllMusic();
  try {
    playerDeathBellAudio.pause();
    playerDeathBellAudio.currentTime = 0;
    playerDeathBellAudio.volume = effectiveVolume;
    playerDeathBellAudio.playbackRate = 1;
    playerDeathBellAudio.loop = false;
    const playPromise = playerDeathBellAudio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  } catch (err) {}
  playerDeathBellFadeTimer = PLAYER_DEATH_BELL_FADE_DELAY + PLAYER_DEATH_BELL_FADE_DURATION;
  playerDeathBellFadeVolume = effectiveVolume;
}

function stopPlayerDeathBell() {
  if (!playerDeathBellAudio) return;
  try {
    playerDeathBellAudio.pause();
    playerDeathBellAudio.currentTime = 0;
  } catch (err) {}
  playerDeathBellFadeTimer = 0;
  playerDeathBellResume = null;
  playerDeathBellActive = false;
}

function playEnemyDeathSfx(volume = 0.35) {
  if (typeof Audio === "undefined") return;
  const effectiveVolume = getEffectiveSfxVolume(volume);
  if (effectiveVolume <= 0) return;
  const gruntChannel = enemyDeathGruntChannel;
  const isGruntPlaying = enemyDeathSfxPool.some(
    (entry) =>
      entry.src &&
      ENEMY_DEATH_GRUNT_SRCS.some((grunt) => entry.src.includes(grunt)) &&
      !entry.paused &&
      !entry.ended,
  );
  let src = ENEMY_DEATH_SFX_SRCS[Math.floor(Math.random() * ENEMY_DEATH_SFX_SRCS.length)];
  const gruntBusy =
    gruntChannel && !gruntChannel.paused && !gruntChannel.ended;
  if (ENEMY_DEATH_GRUNT_SRCS.includes(src) && (isGruntPlaying || gruntBusy)) {
    if (!ENEMY_DEATH_MONSTER_SRCS.length) return;
    src = ENEMY_DEATH_MONSTER_SRCS[Math.floor(Math.random() * ENEMY_DEATH_MONSTER_SRCS.length)];
  }
  const isGrunt = ENEMY_DEATH_GRUNT_SRCS.includes(src);
  let audio = null;
  if (isGrunt && gruntChannel) {
    audio = gruntChannel;
    audio.src = src;
  } else {
    audio = enemyDeathSfxPool.find(
      (entry) => entry.src && entry.src.includes(src) && (entry.paused || entry.ended),
    );
    if (!audio) {
      if (enemyDeathSfxPool.length < ENEMY_DEATH_SFX_POOL_SIZE) {
        audio = new Audio(src);
        audio.preload = "auto";
        enemyDeathSfxPool.push(audio);
      } else {
        audio = enemyDeathSfxPool[0];
        audio.src = src;
      }
    }
  }
  try {
    audio.currentTime = 0;
    audio.volume = isGrunt ? effectiveVolume * 0.6 : effectiveVolume;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  } catch (err) {}
}

if (typeof window !== "undefined") {
  window.playEnemyDeathSfx = playEnemyDeathSfx;
}

function playSwordSwingSfx(volume = 0.55) {
  playPooledSfx(swordSfxPool, SWORD_SWING_SFX_SRC, SWORD_SFX_POOL_SIZE, { volume });
}

if (typeof window !== "undefined") {
  window.playSwordSwingSfx = playSwordSwingSfx;
}

function playSwordSfx(volume = 0.55) {
  playSwordSwingSfx(volume);
}

function playSwooshSfx(volume = 0.55) {
  playSwordSwingSfx(volume);
}

function playRushAttackSfx(volume = 0.7) {
  playPooledSfx(
    rushAttackSfxPool,
    RUSH_ATTACK_SFX_SRC,
    RUSH_ATTACK_SFX_POOL_SIZE,
    { volume, matchSrc: true },
  );
}

function playDashSfx(volume = 0.7) {
  playPooledSfx(dashSfxPool, DASH_SFX_SRC, DASH_SFX_POOL_SIZE, { volume, matchSrc: true });
}

function playSwordKillSfx(volume = 0.7) {
  playPooledSfx(swordKillSfxPool, SWORD_KILL_SFX_SRCS, SWORD_KILL_SFX_POOL_SIZE, { volume, matchSrc: true });
}

if (typeof window !== "undefined") {
  window.playSwordKillSfx = playSwordKillSfx;
}

function playFireballCastSfx(volume = 0.55) {
  playPooledSfx(fireballSfxPool, FIREBALL_CAST_SFX_SRCS, FIREBALL_SFX_POOL_SIZE, { volume, matchSrc: true });
}

if (typeof window !== "undefined") {
  window.playFireballCastSfx = playFireballCastSfx;
}

function playDivineShotSfx(volume = 1.0) {
  if (typeof Audio === "undefined") return;
  const effectiveVolume = getEffectiveSfxVolume(volume);
  if (effectiveVolume <= 0) return;
  const src = DIVINE_SHOT_SFX_SRC;
  let audio = fireballSfxPool.find(
    (entry) => entry.src && entry.src.includes(src) && (entry.paused || entry.ended),
  );
  if (!audio) {
    if (fireballSfxPool.length < FIREBALL_SFX_POOL_SIZE) {
      audio = new Audio(src);
      audio.preload = "auto";
      fireballSfxPool.push(audio);
    } else {
      audio = fireballSfxPool[0];
      audio.src = src;
    }
  }
  try {
    audio.currentTime = 0;
    audio.volume = effectiveVolume;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  } catch (err) {}
}

if (typeof window !== "undefined") {
  window.playDivineShotSfx = playDivineShotSfx;
}

function playWisdomCastSfx(volume = 0.55) {
  playPooledSfx(wisdomSfxPool, WISDOM_CAST_SFX_SRCS, WISDOM_SFX_POOL_SIZE, { volume, matchSrc: true });
}

if (typeof window !== "undefined") {
  window.playWisdomCastSfx = playWisdomCastSfx;
}

function playWisdomHitSfx(volume = 0.8) {
  playPooledSfx(wisdomHitSfxPool, WISDOM_HIT_SFX_SRCS, WISDOM_HIT_SFX_POOL_SIZE, { volume, matchSrc: true });
}

if (typeof window !== "undefined") {
  window.playWisdomHitSfx = playWisdomHitSfx;
}

function playFaithCannonSfx(volume = 0.55) {
  playPooledSfx(faithCannonSfxPool, FAITH_CANNON_SFX_SRCS, FAITH_CANNON_SFX_POOL_SIZE, { volume, matchSrc: true });
}

if (typeof window !== "undefined") {
  window.playFaithCannonSfx = playFaithCannonSfx;
}

function playFaithHitSfx(volume = 0.8) {
  playPooledSfx(faithHitSfxPool, FAITH_HIT_SFX_SRCS, FAITH_HIT_SFX_POOL_SIZE, { volume, matchSrc: true });
}

if (typeof window !== "undefined") {
  window.playFaithHitSfx = playFaithHitSfx;
}

function playPowerupPickupSfx(volume = 1.2) {
  playPooledSfx(powerupPickupSfxPool, POWERUP_PICKUP_SFX_SRC, POWERUP_PICKUP_SFX_POOL_SIZE, { volume });
}

if (typeof window !== "undefined") {
  // Keep separate hooks so we can swap SFX independently later.
  window.playWeaponPowerupPickupSfx = playPowerupPickupSfx;
  window.playUtilityPowerupPickupSfx = playPowerupPickupSfx;
}

function playGracePickupSfx(volume = 0.2) {
  playPooledSfx(gracePickupSfxPool, GRACE_PICKUP_SFX_SRC, GRACE_PICKUP_SFX_POOL_SIZE, { volume });
}

if (typeof window !== "undefined") {
  window.playGracePickupSfx = playGracePickupSfx;
}

function playMenuSelectSfx(volume = 0.55) {
  playPooledSfx(menuSelectSfxPool, MENU_SELECT_SFX_SRC, MENU_SELECT_SFX_POOL_SIZE, { volume });
}

function playMenuMoveSfx(volume = 0.45) {
  playPooledSfx(menuMoveSfxPool, MENU_MOVE_SFX_SRC, MENU_SELECT_SFX_POOL_SIZE, { volume });
}

if (typeof window !== "undefined") {
  // Separate hooks so menu pick vs advance can diverge later.
  window.playMenuItemPickSfx = playMenuSelectSfx;
  window.playMenuAdvanceSfx = playMenuSelectSfx;
  window.playMenuMoveSfx = playMenuMoveSfx;
}

function playWaveTransitionSfx(volume = 0.78) {
  playPooledSfx(
    waveTransitionSfxPool,
    WAVE_TRANSITION_SFX_SRC,
    WAVE_TRANSITION_SFX_POOL_SIZE,
    { volume, matchSrc: true },
  );
}

function playRecapTickSfx(volume = 0.5) {
  playPooledSfx(recapTickSfxPool, RECAP_TICK_SFX_SRC, RECAP_TICK_SFX_POOL_SIZE, { volume });
}

function playRecapFinalSfx(volume = 0.7) {
  playPooledSfx(recapFinalSfxPool, RECAP_FINAL_SFX_SRC, RECAP_FINAL_SFX_POOL_SIZE, { volume });
}

if (typeof window !== "undefined") {
  window.playRecapTickSfx = playRecapTickSfx;
  window.playRecapFinalSfx = playRecapFinalSfx;
}

function playRecapGraceFlySfx(volume = 0.5) {
  playPooledSfx(
    recapGraceFlySfxPool,
    RECAP_GRACE_FLY_SFX_SRC,
    RECAP_GRACE_FLY_SFX_POOL_SIZE,
    { volume },
  );
}

if (typeof window !== "undefined") {
  window.playRecapGraceFlySfx = playRecapGraceFlySfx;
}

function playEnemySpawnSfx(volume = 0.55, options = {}) {
  const maxHealth =
    Number.isFinite(options?.maxHealth) ? options.maxHealth : null;
  let src = ENEMY_SPAWN_SFX_SRC;
  if (maxHealth !== null) {
    const match = ENEMY_SPAWN_HIGH_SFX.find((entry) => maxHealth > entry.minHealth);
    if (match) src = match.src;
  }
  playPooledSfx(enemySpawnSfxPool, src, ENEMY_SPAWN_SFX_POOL_SIZE, { volume });
}

if (typeof window !== "undefined") {
  window.playEnemySpawnSfx = playEnemySpawnSfx;
}

function cancelFade(audio) {
  if (!audio) return;
  const prev = musicState.fadeHandles.get(audio);
  if (prev) cancelAnimationFrame(prev);
  musicState.fadeHandles.delete(audio);
}

function fadeAudio(audio, { to = 0, durationMs = 800, stopOnZero = true } = {}) {
  if (!audio) return;
  cancelFade(audio);
  const from = Number.isFinite(audio.volume) ? audio.volume : 0;
  if (durationMs <= 0 || from === to) {
    audio.volume = to;
    if (stopOnZero && to === 0) audio.pause();
    return;
  }
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / durationMs);
    audio.volume = from + (to - from) * t;
    if (t < 1) {
      const handle = requestAnimationFrame(step);
      musicState.fadeHandles.set(audio, handle);
      return;
    }
    musicState.fadeHandles.delete(audio);
    if (stopOnZero && to === 0) audio.pause();
  };
  const handle = requestAnimationFrame(step);
  musicState.fadeHandles.set(audio, handle);
}

function playMusic(audio, { volume = 0.7, loop = false } = {}) {
  if (!audio) return;
  const effectiveVolume = getEffectiveMusicVolume(volume);
  if (effectiveVolume <= 0) return;
  audio.loop = loop;
  audio.volume = effectiveVolume;
  try {
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  } catch (err) {}
}

function startIntroMusic() {
  if (!musicState.intro || musicState.introStarted || musicState.introStopped) return;
  musicState.introStarted = true;
  playMusic(musicState.intro, { volume: MUSIC_VOLUME_INTRO, loop: false });
}

function startExteriorMusic({ boss = false } = {}) {
  const target = boss ? musicState.exteriorBoss : musicState.exterior;
  if (!target) return;
  if (musicState.battleStarted && !musicState.battleStopped) fadeOutBattleMusic();
  if (musicState.introStarted && !musicState.introStopped) stopIntroMusic();
  if (musicState.recapStarted && !musicState.recapStopped && musicState.recap) {
    fadeAudio(musicState.recap, { to: 0, durationMs: 700, stopOnZero: true });
    musicState.recapStopped = true;
  }
  musicState.exteriorStopped = false;
  musicState.exteriorBossStopped = false;
  musicState.exteriorStarted = !boss;
  musicState.exteriorBossStarted = Boolean(boss);
  musicState.exteriorKind = boss ? "boss" : "normal";
  cancelFade(target);
  try {
    target.currentTime = 0;
  } catch (e) {}
  playMusic(target, { volume: MUSIC_VOLUME_INTRO, loop: false });
}

function stopExteriorMusic() {
  if (musicState.exterior && !musicState.exteriorStopped) {
    musicState.exteriorStopped = true;
    fadeAudio(musicState.exterior, { to: 0, durationMs: MUSIC_FADE_OUT_MS, stopOnZero: true });
  }
  if (musicState.exteriorBoss && !musicState.exteriorBossStopped) {
    musicState.exteriorBossStopped = true;
    fadeAudio(musicState.exteriorBoss, { to: 0, durationMs: MUSIC_FADE_OUT_MS, stopOnZero: true });
  }
}

function startMapMusic() {
  if (!musicState.intro) return;
  if (musicState.battleStarted && !musicState.battleStopped) fadeOutBattleMusic();
  if (musicState.recapStarted && !musicState.recapStopped) stopRecapMusic();
  if (musicState.exteriorStarted && !musicState.exteriorStopped) stopExteriorMusic();
  musicState.introStopped = false;
  musicState.introStarted = true;
  cancelFade(musicState.intro);
  playMusic(musicState.intro, { volume: MUSIC_VOLUME_INTRO, loop: false });
}

function triggerIntroMusicFromInput() {
  if (!musicState.intro || musicState.introStopped) return;
  if (!musicState.introStarted) {
    startIntroMusic();
    return;
  }
  if (musicState.intro.paused) {
    playMusic(musicState.intro, { volume: MUSIC_VOLUME_INTRO, loop: false });
  }
}

function stopIntroMusic() {
  if (!musicState.intro || musicState.introStopped) return;
  musicState.introStopped = true;
  fadeAudio(musicState.intro, { to: 0, durationMs: MUSIC_FADE_OUT_MS, stopOnZero: true });
}

function startBattleMusic(track = "base") {
  const desiredTrack = track === "wave3" || track === "bossPhase3" ? track : "base";
  const desiredAudio = getBattleTrackAudio(desiredTrack);
  if (!desiredAudio) return;
  // If boss exterior music is playing, don't start regular battle music - let boss music continue
  if (musicState.exteriorBossStarted && !musicState.exteriorBossStopped) return;
  if (musicState.bossDeathStarted && !musicState.bossDeathStopped) return;
  const currentAudio = getCurrentBattleAudio();
  if (currentAudio && currentAudio !== desiredAudio) {
    cancelFade(currentAudio);
    fadeAudio(currentAudio, { to: 0, durationMs: MUSIC_FADE_FAST_MS, stopOnZero: true });
  }
  cancelFade(desiredAudio);
  if (musicState.exteriorStarted && !musicState.exteriorStopped) stopExteriorMusic();
  musicState.battleTrack = desiredTrack;
  musicState.battleStopped = false;
  musicState.battleStarted = true;
  playMusic(desiredAudio, { volume: MUSIC_VOLUME_BATTLE, loop: true });
}

function startBossDeathMusic() {
  if (!musicState.bossDeath) return;
  if (musicState.bossDeathStarted && !musicState.bossDeathStopped) return;
  if (musicState.battleStarted && !musicState.battleStopped) fadeOutBattleMusic();
  if (musicState.exteriorStarted && !musicState.exteriorStopped) stopExteriorMusic();
  if (musicState.exteriorBossStarted && !musicState.exteriorBossStopped) stopExteriorMusic();
  musicState.bossDeathStarted = true;
  musicState.bossDeathStopped = false;
  cancelFade(musicState.bossDeath);
  try {
    musicState.bossDeath.currentTime = 0;
  } catch (e) {}
  playMusic(musicState.bossDeath, { volume: MUSIC_VOLUME_BATTLE, loop: false });
}

function startBattleVictoryMusic() {
  if (!musicState.unlocked) return;
  startExteriorMusic({ boss: true });
}

function startRecapMusic() {
  if (!musicState.recap || !musicState.unlocked) return;
  if (musicState.recapStarted && !musicState.recapStopped) return;
  if (musicState.exteriorStarted || musicState.exteriorBossStarted) {
    stopExteriorMusic();
  }
  if (musicState.bossDeathStarted && !musicState.bossDeathStopped && musicState.bossDeath) {
    musicState.bossDeathStopped = true;
    fadeAudio(musicState.bossDeath, { to: 0, durationMs: 900, stopOnZero: true });
  }
  musicState.recapStarted = true;
  musicState.recapStopped = false;
  playMusic(musicState.recap, { volume: MUSIC_VOLUME_BATTLE, loop: false });
}

function startVisitorMusic() {
  if (!musicState.visitor || !musicState.unlocked) return;
  if (musicState.visitorStarted && !musicState.visitorStopped) return;
  musicState.visitorStarted = true;
  musicState.visitorStopped = false;
  playMusic(musicState.visitor, { volume: MUSIC_VOLUME_BATTLE, loop: true });
}

function startEpilogueMusic() {
  if (!musicState.recap || !musicState.unlocked) return;
  musicState.recapStarted = true;
  musicState.recapStopped = false;
  playMusic(musicState.recap, { volume: MUSIC_VOLUME_BATTLE, loop: true });
}

function getFinalEndingState() {
  const finalSize = getCongregationSize();
  const badEnding = finalSize < 70;
  const grew = finalSize > INITIAL_CONGREGATION_SIZE;
  return { finalSize, badEnding, grew };
}

function queuePastorFinalAnnouncement() {
  const { badEnding } = getFinalEndingState();
  const line = badEnding
    ? "\"I heard from the denomination, and unfortunately they can't justify keeping this church open any longer. We have to close.\""
    : "\"I heard from the denomination, and they've decided to keep this church open. I look forward to spending more time with you all and continuing to bring love, joy, and peace into this town!\"";
  queueLevelAnnouncement(line, "", {
    requiresConfirm: true,
    skipMissionBrief: true,
    pastorFinal: true,
  });
}

const PASTOR_BOSS_POST_RECAP_LINES = {
  default: "Great job, everyone. Now let's go out there and love our neighbors as ourselves.",
};

function queuePastorBossPostRecapAnnouncement(levelNumber, upgradeAfter = false) {
  const line =
    PASTOR_BOSS_POST_RECAP_LINES[levelNumber] || PASTOR_BOSS_POST_RECAP_LINES.default;
  queueLevelAnnouncement(line, "", {
    requiresConfirm: true,
    skipMissionBrief: true,
    pastorPostRecap: true,
    pastorPostRecapDelay: 0.6,
    pastorPostRecapUpgradeAfter: upgradeAfter,
  });
}

function activateEpilogue() {
  const { finalSize, badEnding, grew } = getFinalEndingState();
  const introLine = grew
    ? `Over the course of the campaign, you grew your church to ${finalSize} members.`
    : `Over the course of the campaign your congregation shrunk to ${finalSize} members.`;
  const middleLine =
    "Unfortunately, the demonimation has chosen to close your church leaving the town in darknesss.";
  const ministryOptions = [
    "rehab clinics",
    "food pantries",
    "tutoring and school boards",
    "city council involvement",
    "elder care",
    "recovery housing",
    "community mediation",
  ];
  for (let i = ministryOptions.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = ministryOptions[i];
    ministryOptions[i] = ministryOptions[j];
    ministryOptions[j] = tmp;
  }
  const pickedMinistries = ministryOptions.slice(0, 3);
  const ministrySentence = `${pickedMinistries[0]}, ${pickedMinistries[1]}, and ${pickedMinistries[2]}.`;
  const positiveLine =
    "Because of your hard work, the members of your church made a difference in the town.\n\n" +
    "In the years that followed, your church members went in the community and ministered in " +
    `${ministrySentence}\n\n` +
    "The town is thriving and has become a place of light and hope for all its residents and families.\n\n" +
    "Thank you for your faithful service.\n\n\n\n" +
    "Other towns need a pastor like you...";
  const endLine = badEnding ? "Try again." : "";
  epilogueTitle = "Epilogue";
  epilogueBackgroundKey = badEnding ? "gameOver" : "epilogue";
  epilogueText = badEnding
    ? [introLine, middleLine, endLine].filter(Boolean).join(" ")
    : positiveLine;
  // Reset scroll state for epilogue/credits sequence
  epilogueScroll.phase = "epilogue";
  epilogueScroll.scrollY = 0;
  epilogueScroll.delayTimer = 0;
  epilogueScroll.contentHeight = 0;
  epilogueScroll.showButton = false;
  epilogueScroll.paused = false;
  epilogueActive = true;
  pauseAllMusic();
  startEpilogueMusic();
}

function stopRecapMusic() {
  if (!musicState.recap || musicState.recapStopped) return;
  musicState.recapStopped = true;
  fadeAudio(musicState.recap, { to: 0, durationMs: MUSIC_FADE_OUT_MS, stopOnZero: true });
}

function stopVisitorMusic() {
  if (!musicState.visitor || musicState.visitorStopped) return;
  musicState.visitorStopped = true;
  fadeAudio(musicState.visitor, { to: 0, durationMs: MUSIC_FADE_OUT_MS, stopOnZero: true });
}

function stopBattleMusicFast() {
  const activeBattleAudio = getCurrentBattleAudio();
  if (!activeBattleAudio || musicState.battleStopped) return;
  musicState.battleStopped = true;
  fadeAudio(activeBattleAudio, { to: 0, durationMs: MUSIC_FADE_FAST_MS, stopOnZero: true });
}

function fadeOutBattleMusic() {
  const activeBattleAudio = getCurrentBattleAudio();
  if (!activeBattleAudio || musicState.battleStopped) return;
  musicState.battleStopped = true;
  musicState.battleStarted = false;
  fadeAudio(activeBattleAudio, { to: 0, durationMs: MUSIC_FADE_OUT_MS, stopOnZero: true });
}

function startActBreakFade(holdSeconds = ACT_BREAK_HOLD_SECONDS) {
  const hold = Math.max(0, Number(holdSeconds) || 0);
  const total = ACT_BREAK_FADE_IN + ACT_BREAK_FADE_OUT + hold;
  actBreakFadeDuration = Math.max(total, ACT_BREAK_FADE_IN + ACT_BREAK_FADE_OUT);
  actBreakFadeTimer = actBreakFadeDuration;
  actBreakFadeAlpha = 0;
}

function startGraceRushEndFade(duration = 1) {
  const total = Math.max(0.1, Number(duration) || 1);
  graceRushFadeDuration = total;
  graceRushFadeTimer = total;
  graceRushFadeAlpha = 0;
  graceRushFadeHold = false;
  graceRushFadeReleaseTimer = 0;
  graceRushBlackout = false;
}

function startBossBonusTransition(duration = 1.0) {
  const total = Math.max(0.1, Number(duration) || 1.0);
  bossBonusTransitionFadeDuration = total;
  bossBonusTransitionFadeTimer = total;
  bossBonusTransitionFadeAlpha = 0;
  fadeOutBattleMusic();
  if (musicState.bossDeath && musicState.bossDeathStarted && !musicState.bossDeathStopped) {
    musicState.bossDeathStopped = true;
    fadeAudio(musicState.bossDeath, {
      to: 0,
      durationMs: Math.max(250, Math.round(total * 1000)),
      stopOnZero: true,
    });
  }
}

function startRecapIntroFade(duration = 0.65) {
  const total = Math.max(0.1, Number(duration) || 0.65);
  recapIntroFadeDuration = total;
  recapIntroFadeTimer = total;
  recapIntroFadeAlpha = 1;
}

function pauseAllMusic() {
  if (musicState.intro) musicState.intro.pause();
  if (musicState.battle) musicState.battle.pause();
  if (musicState.battleWave3) musicState.battleWave3.pause();
  if (musicState.battleBossPhase3) musicState.battleBossPhase3.pause();
  if (musicState.recap) musicState.recap.pause();
  if (musicState.visitor) musicState.visitor.pause();
  if (musicState.exterior) musicState.exterior.pause();
  if (musicState.exteriorBoss) musicState.exteriorBoss.pause();
  if (musicState.bossDeath) musicState.bossDeath.pause();
}

function resumeBattleMusicIfNeeded() {
  if (!musicState.unlocked) return;
  if (!formationState?.current) return;
  const status = levelManager?.getStatus ? levelManager.getStatus() : null;
  const stage = status?.stage || "";
  const shouldPlay =
    stage === "npcArrival" ||
    stage === "battleIntro" ||
    stage === "waveIntro" ||
    stage === "waveActive" ||
    stage === "allKillBreak" ||
    stage === "waveCleared" ||
    stage === "bossIntro" ||
    stage === "bossActive" ||
    musicState.battlePrimed;
  if (shouldPlay) {
    const desiredTrack = getDesiredBattleTrack(status);
    if (!musicState.battleStarted) {
      startBattleMusic(desiredTrack);
    } else {
      if (musicState.battleTrack !== desiredTrack) {
        startBattleMusic(desiredTrack);
        return;
      }
      const activeBattleAudio = getCurrentBattleAudio();
      if (activeBattleAudio && activeBattleAudio.paused) {
        playMusic(activeBattleAudio, { volume: MUSIC_VOLUME_BATTLE, loop: true });
      }
    }
  }
}

function shouldStartBattleMusicNow() {
  const status = levelManager?.getStatus ? levelManager.getStatus() : null;
  if (!formationState?.current) return false;
  return Boolean(
    status?.stage === "npcArrival" ||
      status?.stage === "battleIntro" ||
      status?.stage === "waveIntro" ||
      status?.stage === "waveActive" ||
      status?.stage === "allKillBreak" ||
      status?.stage === "waveCleared" ||
      status?.stage === "bossIntro" ||
      status?.stage === "bossActive" ||
      musicState.battlePrimed,
  );
}

function unlockMusicOnGesture() {
  if (musicState.unlocked) return;
  musicState.unlocked = true;
  // Don't auto-start intro music on first click - wait for Play button
  // But do start battle music if we're already in a battle
  if (!musicState.battleStarted && !musicState.battleStopped && shouldStartBattleMusicNow()) {
    const status = levelManager?.getStatus ? levelManager.getStatus() : null;
    startBattleMusic(getDesiredBattleTrack(status));
  }
}

function startMusicOnFirstClick() {
  if (musicState.awaitingUserGesture) return;
  musicState.awaitingUserGesture = true;
  const handler = () => {
    musicState.awaitingUserGesture = false;
    unlockMusicOnGesture();
  };
  window.addEventListener("pointerdown", handler, { once: true });
  window.addEventListener("touchstart", handler, { once: true });
  window.addEventListener("keydown", handler, { once: true });
}

function resetMusicState() {
  if (musicState.intro) {
    cancelFade(musicState.intro);
    musicState.intro.pause();
    musicState.intro.currentTime = 0;
    musicState.intro.volume = 0;
  }
  if (musicState.battle) {
    cancelFade(musicState.battle);
    musicState.battle.pause();
    musicState.battle.currentTime = 0;
    musicState.battle.volume = 0;
  }
  if (musicState.battleWave3) {
    cancelFade(musicState.battleWave3);
    musicState.battleWave3.pause();
    musicState.battleWave3.currentTime = 0;
    musicState.battleWave3.volume = 0;
  }
  if (musicState.battleBossPhase3) {
    cancelFade(musicState.battleBossPhase3);
    musicState.battleBossPhase3.pause();
    musicState.battleBossPhase3.currentTime = 0;
    musicState.battleBossPhase3.volume = 0;
  }
  if (musicState.recap) {
    cancelFade(musicState.recap);
    musicState.recap.pause();
    musicState.recap.currentTime = 0;
    musicState.recap.volume = 0;
  }
  if (musicState.visitor) {
    cancelFade(musicState.visitor);
    musicState.visitor.pause();
    musicState.visitor.currentTime = 0;
    musicState.visitor.volume = 0;
  }
  if (musicState.exterior) {
    cancelFade(musicState.exterior);
    musicState.exterior.pause();
    musicState.exterior.currentTime = 0;
    musicState.exterior.volume = 0;
  }
  if (musicState.exteriorBoss) {
    cancelFade(musicState.exteriorBoss);
    musicState.exteriorBoss.pause();
    musicState.exteriorBoss.currentTime = 0;
    musicState.exteriorBoss.volume = 0;
  }
  if (musicState.bossDeath) {
    cancelFade(musicState.bossDeath);
    musicState.bossDeath.pause();
    musicState.bossDeath.currentTime = 0;
    musicState.bossDeath.volume = 0;
  }
  musicState.introStarted = false;
  musicState.battleStarted = false;
  musicState.recapStarted = false;
  musicState.visitorStarted = false;
  musicState.exteriorStarted = false;
  musicState.exteriorBossStarted = false;
  musicState.bossDeathStarted = false;
  musicState.introStopped = false;
  musicState.battleStopped = false;
  musicState.recapStopped = false;
  musicState.visitorStopped = false;
  musicState.exteriorStopped = false;
  musicState.exteriorBossStopped = false;
  musicState.bossDeathStopped = false;
  musicState.exteriorKind = "normal";
  musicState.battleTrack = "base";
  musicState.awaitingUserGesture = false;
  musicState.unlocked = false;
}

if (typeof window !== "undefined") {
  window.stopIntroMusic = stopIntroMusic;
  window.stopBattleMusicFast = stopBattleMusicFast;
  window.fadeOutBattleMusic = fadeOutBattleMusic;
  window.startMapMusic = startMapMusic;
  window.startExteriorMusic = startExteriorMusic;
  window.startBattleMusicFromFormation = () => {
    musicState.battlePrimed = true;
    musicState.unlocked = true;
    startBattleMusic();
  };
  window.pauseAllMusic = pauseAllMusic;
  window.resumeBattleMusicIfNeeded = resumeBattleMusicIfNeeded;
}

function playVisitorHitSfx(volume = 0.55) {
  playPooledSfx(visitorHitSfxPool, VISITOR_HIT_SFX_SRC, VISITOR_HIT_SFX_POOL_SIZE, { volume });
}

function playChattyHitSfx(volume = 0.55) {
  playPooledSfx(chattyHitSfxPool, CHATTY_HIT_SFX_SRC, CHATTY_HIT_SFX_POOL_SIZE, { volume });
}

function playVisitorSavedSfx(volume = 0.85) {
  playPooledSfx(visitorSavedSfxPool, VISITOR_SAVED_SFX_SRC, VISITOR_SAVED_SFX_POOL_SIZE, { volume });
}

function getPlayerChargeVisualAnchor(targetPlayer = player) {
  if (!targetPlayer) return null;
  const hitboxRect = getPlayerHitboxRect(targetPlayer);
  if (hitboxRect) {
    return {
      x: hitboxRect.x + hitboxRect.width * 0.5,
      y: hitboxRect.y - DIVINE_CHARGE_SPARK_OFFSET,
    };
  }
  return {
    x: targetPlayer.x,
    y: targetPlayer.y - (targetPlayer.radius || 24) - DIVINE_CHARGE_SPARK_OFFSET,
  };
}

function spawnDivineChargeSparkVisual() {
  if (!player) return null;
  const frames = assets?.effects?.divineChargeSpark;
  if (!Array.isArray(frames) || !frames.length) return null;
  if (divineChargeSparkEffect && !divineChargeSparkEffect.dead) return divineChargeSparkEffect;
  const anchor = getPlayerChargeVisualAnchor(player);
  if (!anchor) return null;
  divineChargeSparkEffect = Effects.spawnLoopingEffect(frames, anchor.x, anchor.y, {
    frameDuration: DIVINE_CHARGE_SPARK_FRAME_DURATION,
    scale: DIVINE_CHARGE_SPARK_SCALE,
  });
  return divineChargeSparkEffect;
}

function getDivineChargeFlashFrames() {
  if (Array.isArray(divineChargeFlashFrames) && divineChargeFlashFrames.length) {
    return divineChargeFlashFrames;
  }
  divineChargeFlashFrames = [];
  for (let i = 1; i <= 14; i += 1) {
    const img = new Image();
    img.src = `assets/sprites/projectiles/flash/flash${i}.png`;
    divineChargeFlashFrames.push(img);
  }
  return divineChargeFlashFrames;
}

function spawnDivineChargeReadyVisual(effectKey = "melee") {
  if (!player) return null;
  const anchor = getPlayerChargeVisualAnchor(player);
  if (!anchor) return null;
  const flashFrames = getDivineChargeFlashFrames();
  if (!Array.isArray(flashFrames) || !flashFrames.length) return null;

  if (effectKey === "prayerBomb") {
    if (!prayerBombReadyEffect || prayerBombReadyEffect.dead) {
      prayerBombReadyEffect = Effects.spawnLoopingEffect(flashFrames, anchor.x, anchor.y, {
        frameDuration: 0.03,
        scale: 2.0,
      });
    }
    prayerBombReadyEffect.x = anchor.x;
    prayerBombReadyEffect.y = anchor.y;
    return prayerBombReadyEffect;
  }

  if (divineChargeFlashEffect && !divineChargeFlashEffect.dead) {
    divineChargeFlashEffect.x = anchor.x;
    divineChargeFlashEffect.y = anchor.y;
    return divineChargeFlashEffect;
  }
  divineChargeFlashEffect = Effects.spawnLoopingEffect(flashFrames, anchor.x, anchor.y, {
    frameDuration: 0.03,
    scale: 2.0,
  });
  return divineChargeFlashEffect;
}

function updateDivineChargeSparkVisual(dt, chargeTimer, holdTime) {
  if (!player) return;

  // Create charge effect if it doesn't exist
  if (!divineChargeSparkEffect || divineChargeSparkEffect.dead) {
    const frames = assets?.effects?.divineChargeSpark;
    if (!Array.isArray(frames) || !frames.length) return;
    const anchor = getPlayerChargeVisualAnchor(player);
    if (!anchor) return;
    divineChargeSparkEffect = Effects.spawnLoopingEffect(frames, anchor.x, anchor.y, {
      frameDuration: DIVINE_CHARGE_SPARK_FRAME_DURATION,
      scale: DIVINE_CHARGE_SPARK_SCALE,
    });
  }

  // Keep charge visuals centered above the player's body instead of offsetting sideways.
  if (divineChargeSparkEffect) {
    const anchor = getPlayerChargeVisualAnchor(player);
    if (!anchor) return;
    divineChargeSparkEffect.x = anchor.x;
    divineChargeSparkEffect.y = anchor.y;

    // Scale effect based on charge progress
    const chargePercent = Math.min(1, chargeTimer / holdTime);
    divineChargeSparkEffect.scale = DIVINE_CHARGE_SPARK_SCALE * (0.5 + chargePercent * 0.5);
  }
}

function clearDivineChargeSparkVisual() {
  if (divineChargeSparkEffect) {
    divineChargeSparkEffect.dead = true;
    divineChargeSparkEffect = null;
  }
  if (divineChargeFlashEffect) {
    divineChargeFlashEffect.dead = true;
    divineChargeFlashEffect = null;
  }
}

function clearPrayerBombReadyVisual() {
  if (prayerBombReadyEffect) {
    prayerBombReadyEffect.dead = true;
    prayerBombReadyEffect = null;
  }
}
const GRACE_SPRITE_FILES = [
  "assets/sprites/items/icons/I62_Gem_L.png",
];
const visitorSession = {
  active: false,
  timer: 0,
  duration: VISITOR_SESSION_DURATION,
  visitors: [],
  blockers: [],
  savedVisitors: 0,
  quietedBlockers: 0,
  onComplete: null,
  autoTriggered: false,
  sourceLevel: 0,
  bounds: null,
  targetVisitors: VISITOR_GUEST_COUNT,
  summaryActive: false,
  newMemberPortraits: [],
  introActive: false,
  summaryReason: null,
  awaitingSummaryConfirm: false,
  usedNpcIds: new Set(),
  usedChattyLines: new Set(),
  recapShown: false,
  introShown: false,
};
const graceRushState = {
  active: false,
  timer: 0,
  duration: 0,
  elapsed: 0,
  reason: "battle",
  // Prevent accidental instant skip when Space is still being pressed
  // from prior overlays/transitions.
  skipLockDuration: 0.9,
  spawnTimer: 0,
  spawnInterval: 1,
  burstAmount: 16,
  centerX: null,
  centerY: null,
  farewellQueue: [],
  farewellNextAt: 0,
  farewellSpokenCount: 0,
};
let lastEnemyDeathPosition = null;
const GRACE_RUSH_FAREWELL_LINES = [
  "See you around church.",
  "See you Sunday.",
  "See ya soon.",
  "Let's get coffee later.",
];
const VICTORY_OPENING_LINES = [
  "This really helped me.",
  "Thanks, Pastor!",
  "I feel ready now.",
  "I can face this now.",
  "I feel stronger already.",
  "This gave me hope.",
];

function resetGraceRushNpcFarewellState({ resetAlpha = true } = {}) {
  graceRushState.farewellQueue = [];
  graceRushState.farewellNextAt = 0;
  graceRushState.farewellSpokenCount = 0;
  if (!resetAlpha) return;
  if (!Array.isArray(npcs)) return;
  npcs.forEach((npc) => {
    if (!npc) return;
    npc.graceRushNpcFadeAlpha = 1;
    npc.graceRushFarewellIndex = null;
  });
}

function prepareGraceRushNpcFarewellQueue() {
  resetGraceRushNpcFarewellState();
  if (graceRushState.reason === "boss") return;
  const activeSurvivors = Array.isArray(npcs)
    ? npcs.filter((npc) => npc && !npc.departed && npc.active)
    : [];
  if (!activeSurvivors.length) return;
  const speakerCount = activeSurvivors.length;
  const shuffled = [...activeSurvivors].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, speakerCount);
  graceRushState.farewellQueue = picked.map((npc, index) => {
    npc.graceRushFarewellIndex = index;
    return { npc, line: null };
  });
  graceRushState.farewellNextAt = 0.35;
  graceRushState.farewellSpokenCount = 0;
}
visitorSession.activeChatty = new Set();
visitorSession.lockingBlockers = new Set();
visitorSession.movementLock = false;

// Track per-season congregation changes (4-month blocks)
const seasonStats = {
  seasonNumber: 1,
  monthlyAdded: 0, // sum of member deltas from monthly recaps
  lost: 0, // total NPCs lost across the season
  bossBonus: 0, // bonus from boss win
  bossBonusApplied: false,
  recapShown: false,
  startCongregation: null,
  visitorAdded: 0,
};

function isPlayerMovementLocked() {
  const meleeState = window?._meleeAttackState;
  const spinActive = Boolean(meleeState?.spinTimer > 0);
  const swingActive = Boolean(meleeState?.swooshTimer > 0);
  const rushActive = Boolean(meleeState?.isRushing);
  const ringFireActive = Boolean(meleeState?.ringFireActive);
  if (rushActive) return false;
  return Boolean((visitorSession.active && visitorSession.movementLock) || spinActive || swingActive || ringFireActive);
}

if (typeof window !== "undefined") {
  window.Battlechurch = window.Battlechurch || {};
  window.BattlechurchComboTrackerEnabled = true;
  window.BattlechurchComboTrackerAllow = false;
  window.Battlechurch.isPlayerMovementLocked = isPlayerMovementLocked;
  window.selectFormation = selectFormation;
  window.clearFormationSelection = clearFormationSelection;
  window.getFormationBonuses = getFormationBonuses;
  window.applyFormationAnchors = applyFormationAnchors;
  window.setCozyNpcsToFrontlineFormation = setCozyNpcsToFrontlineFormation;
  window.Battlechurch.isBossStageActive = () => {
    try {
      if (levelManager?.getStatus) {
        const stage = levelManager.getStatus().stage;
        return stage === "bossIntro" || stage === "bossActive";
      }
    } catch (e) {}
    return false;
  };
}
const DEFAULT_HERO_LIVES = 1;
const DEV_OVERRIDE_HERO_LIVES = 3;
const DEV_THREE_LIVES_STORAGE_KEY = "battlechurch.devThreeLivesMode";
function loadDevThreeLivesMode() {
  try {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(DEV_THREE_LIVES_STORAGE_KEY) === "1";
  } catch (_error) {
    return false;
  }
}
function persistDevThreeLivesMode(enabled) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(DEV_THREE_LIVES_STORAGE_KEY, enabled ? "1" : "0");
  } catch (_error) {}
}

let enemyDevLabelsVisible = false;
const devTools = {
  godMode: false,
  showCombatDebug: false,
  showNpcZones: false,
  threeLivesMode: loadDevThreeLivesMode(),
  enemyHpBarThreshold: 100,
  // Adjustable runtime tuning for NPC combat behaviour
  npcFireCooldown: 1.2, // seconds between NPC arrow shots when at full faith
  npcFaithPerEnemy: 0, // faith gained by NPCs per enemy defeated
};
function getConfiguredHeroLives() {
  return devTools.threeLivesMode ? DEV_OVERRIDE_HERO_LIVES : DEFAULT_HERO_LIVES;
}
let heroLives = getConfiguredHeroLives();

function clearFormationSelection() {
  formationState.current = null;
  formationState.bonuses = {
    rof: 0,
    damage: 0,
    powerupDuration: 0,
    prayerChargeGain: 0,
    armorPierce: false,
    projectileType: null,
  };
  formationState.homePressure = 0;
  formationState.combatSpreadScaleCurrent = formationState.combatSpreadScale || 1.18;
}

function selectFormation(key) {
  const preset = FORMATION_PRESETS[key];
  if (!preset) return null;
  formationState.current = key;
  formationState.bonuses = { ...preset.bonuses };
  formationState.homePressure = 0;
  formationState.combatSpreadScaleCurrent = formationState.combatSpreadScale || 1.18;
  return preset;
}

function getFormationBonuses() {
  return formationState?.bonuses || {
    rof: 0,
    damage: 0,
    powerupDuration: 0,
    prayerChargeGain: 0,
    armorPierce: false,
    projectileType: null,
  };
}

function resolveNpcWeaponPowerup(effect, def = {}) {
  const base = resolveWeaponPowerupConfig(effect, def);
  // NPC versions: weaker damage, keep duration and cooldown/speed multipliers
  let baseFactor = 0.2;
  if (effect === "npcWisdomWeapon") baseFactor = 0.3;
  if (effect === "npcFaithWeapon") baseFactor = 0.24; // +20% over 0.2
  return {
    ...base,
    damageMultiplier: (base.damageMultiplier ?? 1) * baseFactor,
  };
}

function applyNpcWeaponPowerup(effect, def = {}) {
  const cfg = resolveNpcWeaponPowerup(effect, def);
  const formation = getFormationBonuses();
  const durationScale = 1 + (formation.powerupDuration || 0);
  const scaledDuration = (cfg.duration || 0) * durationScale;
  const mapping = {
    npcScriptureWeapon: "fire",
    npcWisdomWeapon: "wisdom_missle",
    npcFaithWeapon: "faith_cannon",
  };
  const mode = mapping[effect] || null;
  if (!mode) return;
  npcWeaponState.mode = mode;
  npcWeaponState.timer = scaledDuration || 0;
  npcWeaponState.duration = scaledDuration || 0;
  npcWeaponState.damageMultiplier = cfg.damageMultiplier ?? 1;
  npcWeaponState.cooldownMultiplier = cfg.cooldownMultiplier ?? 1;
  npcWeaponState.speedMultiplier = cfg.speedMultiplier ?? 1;
}

function computeFormationAnchors(count) {
  const anchors = [];
  const home = getNpcHomeBounds();
  if (!home) return anchors;
  const cx = home.x;
  const cy = home.y;
  const rx = (home.maxX - home.minX) / 2;
  const ry = (home.maxY - home.minY) / 2;
  const spreadScale = Math.max(
    0.5,
    Math.min(
      1.35,
      Number.isFinite(formationState?.combatSpreadScaleCurrent)
        ? formationState.combatSpreadScaleCurrent
        : (formationState?.combatSpreadScale || 1),
    ),
  );
  const presetKey = formationState.current || "circle";
  switch (presetKey) {
    case "line": {
      const radius = Math.min(rx, ry) * 0.82 * spreadScale;
      const start = (210 * Math.PI) / 180;
      const end = (-30 * Math.PI) / 180;
      const zoneStep = count > 1 ? (end - start) / (count - 1) : 0;
      for (let i = 0; i < count; i += 1) {
        const t = count === 1 ? 0.5 : i / (count - 1);
        const angle = start + (end - start) * t;
        anchors.push({
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
          angle,
          zoneHalfSpan: Math.abs(zoneStep) * 0.5,
          zoneIndex: i,
          zoneCount: count,
        });
      }
      break;
    }
    case "crescent": {
      const radius = Math.min(rx, ry) * 0.78 * spreadScale;
      // Smile: arc that faces left/right/bottom; use angles from 210° to -30°
      const start = (210 * Math.PI) / 180;
      const end = (-30 * Math.PI) / 180;
      const zoneStep = count > 1 ? (end - start) / (count - 1) : 0;
      for (let i = 0; i < count; i += 1) {
        const t = count === 1 ? 0.5 : i / (count - 1);
        const angle = start + (end - start) * t;
        anchors.push({
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
          angle,
          zoneHalfSpan: Math.abs(zoneStep) * 0.5,
          zoneIndex: i,
          zoneCount: count,
        });
      }
      break;
    }
    case "circle":
    default: {
      const radius = Math.min(rx, ry) * 0.82 * spreadScale;
      const start = (210 * Math.PI) / 180;
      const end = (-30 * Math.PI) / 180;
      const zoneStep = count > 1 ? (end - start) / (count - 1) : 0;
      for (let i = 0; i < count; i += 1) {
        const t = count === 1 ? 0.5 : i / (count - 1);
        const angle = start + (end - start) * t;
        anchors.push({
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
          angle,
          zoneHalfSpan: Math.abs(zoneStep) * 0.5,
          zoneIndex: i,
          zoneCount: count,
        });
      }
      break;
    }
  }
  formationState.anchors = anchors;
  return anchors;
}

function getNpcZoneWanderPoint(npc, { inwardBias = 0, angleJitterScale = 0.42, edgeBias = 0 } = {}) {
  const home = getNpcHomeBounds();
  const anchor = npc?.formationAnchor || null;
  if (!home || !anchor) {
    return {
      x: home?.x || npc?.x || 0,
      y: home?.y || npc?.y || 0,
    };
  }
  const baseAngle = Number.isFinite(anchor.angle)
    ? anchor.angle
    : Math.atan2(anchor.y - home.y, anchor.x - home.x);
  const halfSpan = Number.isFinite(anchor.zoneHalfSpan) ? anchor.zoneHalfSpan : 0.35;
  const angle = baseAngle + randomInRange(-halfSpan, halfSpan) * angleJitterScale;
  const anchorRadius = Math.hypot(anchor.x - home.x, anchor.y - home.y);
  const radiusMin = Math.max(28, anchorRadius * Math.max(0.32, 0.72 - inwardBias * 0.35));
  const radiusMax = Math.max(radiusMin + 8, anchorRadius * Math.max(0.48, 1.02 - inwardBias * 0.2));
  const edgeBlend = Math.max(0, Math.min(1, edgeBias));
  const blendedRadiusMin = mixLinear(radiusMin, radiusMax, edgeBlend * 0.82);
  const radius = randomInRange(blendedRadiusMin, radiusMax);
  return clampPointToBounds(
    home,
    home.x + Math.cos(angle) * radius,
    home.y + Math.sin(angle) * radius,
  );
}

function getNpcZoneReadyPoint(npc) {
  const pressure = Math.max(0, Math.min(1, formationState?.homePressure || 0));
  const home = getNpcHomeBounds();
  const anchor = npc?.formationAnchor || null;
  if (!home || !anchor) {
    return getNpcZoneWanderPoint(npc, {
      inwardBias: pressure * 0.08,
      angleJitterScale: 0.34,
      edgeBias: 1,
    });
  }
  const baseAngle = Number.isFinite(anchor.angle)
    ? anchor.angle
    : Math.atan2(anchor.y - home.y, anchor.x - home.x);
  const halfSpan = Number.isFinite(anchor.zoneHalfSpan) ? anchor.zoneHalfSpan : 0.35;
  if (!Number.isFinite(npc.zonePatrolDirection) || npc.zonePatrolDirection === 0) {
    npc.zonePatrolDirection = Math.random() < 0.5 ? -1 : 1;
  } else {
    npc.zonePatrolDirection *= -1;
  }
  const currentAngle = Math.atan2((npc?.y || anchor.y) - home.y, (npc?.x || anchor.x) - home.x);
  let patrolOffset = halfSpan * randomInRange(0.6, 0.95) * npc.zonePatrolDirection;
  let angle = baseAngle + patrolOffset;
  if (Math.abs(angle - currentAngle) < halfSpan * 0.45) {
    patrolOffset = halfSpan * 0.95 * npc.zonePatrolDirection;
    angle = baseAngle + patrolOffset;
  }
  const anchorRadius = Math.hypot(anchor.x - home.x, anchor.y - home.y);
  const radius = anchorRadius * (0.97 - pressure * 0.06);
  let point = clampPointToBounds(
    home,
    home.x + Math.cos(angle) * radius,
    home.y + Math.sin(angle) * radius,
  );
  const minTravel = Math.max(18, anchorRadius * 0.12);
  const travel = Math.hypot(point.x - (npc?.x || point.x), point.y - (npc?.y || point.y));
  if (travel < minTravel) {
    const fallbackAngle = baseAngle - patrolOffset;
    point = clampPointToBounds(
      home,
      home.x + Math.cos(fallbackAngle) * radius,
      home.y + Math.sin(fallbackAngle) * radius,
    );
  }
  return point;
}

function getNpcDistinctReadyPoint(npc, minTravel = 28) {
  if (!npc) return null;
  let bestPoint = null;
  let bestDistance = -Infinity;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const point = getNpcZoneReadyPoint(npc);
    if (!point) continue;
    const distance = Math.hypot(point.x - (npc.x || point.x), point.y - (npc.y || point.y));
    if (distance >= minTravel) {
      return point;
    }
    if (distance > bestDistance) {
      bestDistance = distance;
      bestPoint = point;
    }
  }
  return bestPoint || getNpcZoneReadyPoint(npc);
}

function getNpcZonePatrolPoint(npc, side = 1) {
  const home = getNpcHomeBounds();
  const anchor = npc?.formationAnchor || null;
  if (!home || !anchor) return getNpcZoneReadyPoint(npc);
  const baseAngle = Number.isFinite(anchor.angle)
    ? anchor.angle
    : Math.atan2(anchor.y - home.y, anchor.x - home.x);
  const halfSpan = Number.isFinite(anchor.zoneHalfSpan) ? anchor.zoneHalfSpan : 0.35;
  const patrolSide = side >= 0 ? 1 : -1;
  const angle = baseAngle + halfSpan * 0.72 * patrolSide;
  const anchorRadius = Math.hypot(anchor.x - home.x, anchor.y - home.y);
  const radius = anchorRadius * 0.985;
  return clampPointToBounds(
    home,
    home.x + Math.cos(angle) * radius,
    home.y + Math.sin(angle) * radius,
  );
}

function getNpcFrontlineDesiredPoint(npc) {
  const home = getNpcHomeBounds();
  const anchor = npc?.formationAnchor || null;
  if (!home || !anchor) return getNpcZonePatrolPoint(npc, npc?.zonePatrolSide || 1);
  const pressure = Math.max(0, Math.min(1, formationState?.homePressure || 0));
  const baseAngle = Number.isFinite(anchor.angle)
    ? anchor.angle
    : Math.atan2(anchor.y - home.y, anchor.x - home.x);
  const halfSpan = Number.isFinite(anchor.zoneHalfSpan) ? anchor.zoneHalfSpan : 0.35;
  const anchorRadius = Math.hypot(anchor.x - home.x, anchor.y - home.y);
  const patrolClock = Number.isFinite(npc?.patrolClock) ? npc.patrolClock : 0;
  const laneSwing = Math.sin(patrolClock) * halfSpan * 0.74;
  const angle = baseAngle + laneSwing;
  const radialPulse = Math.cos(patrolClock * 0.55 + (anchor.zoneIndex || 0) * 0.45) * 0.018;
  const radius = anchorRadius * Math.max(0.82, 0.975 - pressure * 0.07 + radialPulse);
  return clampPointToBounds(
    home,
    home.x + Math.cos(angle) * radius,
    home.y + Math.sin(angle) * radius,
  );
}

function getNpcBriefingPoint(npc) {
  const home = getNpcHomeBounds();
  if (!home) {
    return npc?.formationAnchor
      ? { x: npc.formationAnchor.x, y: npc.formationAnchor.y }
      : { x: npc?.x || 0, y: npc?.y || 0 };
  }
  const retreatCenter = getNpcAnchorRetreatPoint(npc, home, 0.46);
  const anchor = npc?.formationAnchor || null;
  const baseAngle = Number.isFinite(anchor?.angle)
    ? anchor.angle
    : Math.atan2(retreatCenter.y - home.y, retreatCenter.x - home.x);
  const orbit = Number.isFinite(npc?.patrolClock) ? npc.patrolClock : 0;
  const angle = baseAngle + Math.sin(orbit * 0.8) * 0.12;
  const radius = Math.max(8, home.radius * 0.045);
  return clampPointToBounds(
    home,
    retreatCenter.x + Math.cos(angle) * radius,
    retreatCenter.y + Math.sin(angle) * radius,
  );
}

function assignNpcFrontlinePatrolTarget(npc, { forceFlip = false } = {}) {
  if (!npc) return null;
  if (!Number.isFinite(npc.zonePatrolSide) || npc.zonePatrolSide === 0) {
    npc.zonePatrolSide = Math.random() < 0.5 ? -1 : 1;
  } else if (forceFlip) {
    npc.zonePatrolSide *= -1;
  }
  if (forceFlip) {
    npc.patrolClock = (npc.patrolClock || 0) + Math.PI * 0.75;
  }
  const target = getNpcFrontlineDesiredPoint(npc);
  npc.target = target;
  npc.zoneMoveMode = "frontline";
  npc.frontlinePatrolTimer = randomInRange(0.8, 1.4);
  return target;
}

function setCozyNpcsToBriefingFormation() {
  if (!Array.isArray(npcs) || !npcs.length) return;
  npcs.forEach((npc) => {
    if (!npc || npc.departed || !npc.active) return;
    npc.zoneMoveMode = "briefing";
    npc.safeRecoveryTimer = 0;
    npc.retreatCommitTimer = 0;
    npc.idleTimer = 0;
    npc.target = getNpcBriefingPoint(npc);
  });
}

function setCozyNpcsToFrontlineFormation() {
  if (!Array.isArray(npcs) || !npcs.length) return;
  npcs.forEach((npc) => {
    if (!npc || npc.departed || !npc.active) return;
    npc.zoneMoveMode = "frontline";
    npc.safeRecoveryTimer = 1;
    npc.retreatCommitTimer = 0;
    npc.idleTimer = 0;
    npc.target = getNpcFrontlineDesiredPoint(npc);
  });
}

function resetFormationSwaps() {
  if (formationState?.swappedThisBattle) {
    formationState.swappedThisBattle.clear();
  }
  if (formationState) {
    formationState.swapCooldown = 0;
  }
}

function rotateNpcPositionsForActBreak() {
  if (!npcs || !npcs.length) return;
  resetFormationSwaps();
  const swaps = Math.min(3, Math.floor(npcs.length / 2));
  for (let i = 0; i < swaps; i += 1) {
    maybeSwapNpcPositions({ force: true });
  }
}

function maybeSwapNpcPositions(options = {}) {
  // Only run during active battles; skip if no formation selected.
  if (!npcs || !npcs.length) return;
  const status =
    typeof levelManager?.getStatus === "function" ? levelManager.getStatus() : null;
  const activeStages = new Set(["waveActive", "bossActive", "graceRush"]);
  const forceSwap = Boolean(options.force);
  if (!forceSwap) {
    if ((formationState?.swapCooldown || 0) > 0) return;
  }
  if (!forceSwap && (!status || !activeStages.has(status.stage))) return;
  if (!formationState?.current) return;
  // Candidates: active NPCs not departed/drained
  const active = npcs.filter(
    (npc) => npc && npc.active && !npc.departed && npc.state !== "drained",
  );
  if (active.length < 2) return;
  // Find lowest and highest faith to rotate who is taking damage.
  let low = null;
  let high = null;
  for (const npc of active) {
    if (!low || npc.faith < low.faith) low = npc;
    if (!high || npc.faith > high.faith) high = npc;
  }
  if (!low) return;
  if (!high || high === low) return;
  if (!forceSwap && high.faith - low.faith < 1) return;
  // Swap anchors and set new targets so they walk to swapped spots
  const lowAnchor = low.formationAnchor ? { ...low.formationAnchor } : null;
  const hiAnchor = high.formationAnchor ? { ...high.formationAnchor } : null;
  if (!lowAnchor || !hiAnchor) return;
  low.formationAnchor = hiAnchor;
  high.formationAnchor = lowAnchor;
  low.zoneMoveMode = "frontline";
  high.zoneMoveMode = "frontline";
  low.idleTimer = 0;
  high.idleTimer = 0;
  low.safeRecoveryTimer = 1;
  high.safeRecoveryTimer = 1;
  assignNpcFrontlinePatrolTarget(low, { forceFlip: true });
  assignNpcFrontlinePatrolTarget(high, { forceFlip: true });
  if (!forceSwap && formationState) {
    formationState.swapCooldown = 6;
  }
}
// Enemy spawning constants (tunable via GameBalance.spawning.*)
const MAX_ACTIVE_ENEMIES = _gb('spawning.maxActiveEnemies', 120);
const SKELETON_MIN_COUNT = _gb('spawning.skeletonMinCount', 4);
const SKELETON_PACK_SIZE = _gb('spawning.skeletonPackSize', 4);
const MINI_IMP_BASE_GROUP_SIZE = _gb('spawning.miniImpBaseGroupSize', 48);
const MINI_IMP_MAX_GROUP_SIZE = _gb('spawning.miniImpMaxGroupSize', 120);
const MINI_IMP_MIN_GROUPS_PER_HORDE = _gb('spawning.miniImpMinGroupsPerHorde', 1);
const ENEMY_GROUP_SPAWN_STAGGER_MS = _gb('spawning.groupSpawnStaggerMs', 80);
const RESPAWN_DELAY = _gb('player.respawnDelay', 2.5);
const RESPAWN_STATUS_INTERVAL = _gb('player.respawnStatusInterval', 0.5);
const RESPAWN_SHIELD_DURATION = _gb('player.respawnShieldDuration', 6);
let playerRespawnPending = false;
let respawnTimer = 0;
let respawnIndicatorTimer = 0;
// track auto-spawn of MiniFolks for level 1 so only one appears automatically
let lastLevelNumber = null;
// track whether one automatic enemy has spawned on level 1

function getNpcHomeBounds() {
  const centerX = canvas.width / 2;
  const playableHeight = canvas.height - HUD_HEIGHT;
  const centerY = HUD_HEIGHT + playableHeight * (1 / 3);
  const radius = Math.max(180, Math.min(centerX * 0.72, playableHeight * 0.31));
  const minX = Math.max(0, centerX - radius);
  const maxX = Math.min(canvas.width, centerX + radius);
  const minY = Math.max(HUD_HEIGHT, centerY - radius);
  const maxY = Math.min(canvas.height, centerY + radius);
  return { x: centerX, y: centerY, radius, minX, maxX, minY, maxY };
}

function computeNpcHomeThreatPressure() {
  const home = getNpcHomeBounds();
  if (!home) return 0;
  const threatRadius = home.radius + 220;
  let pressure = 0;
  for (const enemy of enemies) {
    if (!enemy || enemy.dead || enemy.state === "death") continue;
    const center = getEnemyHitboxCenter(enemy);
    const dx = center.x - home.x;
    const dy = center.y - home.y;
    const distance = Math.hypot(dx, dy);
    if (distance > threatRadius) continue;
    const closeness = 1 - distance / Math.max(1, threatRadius);
    const weight =
      enemy.damageClass === "armored" ? 1.35 :
      enemy.damageClass === "tank" ? 1.2 :
      enemy.isBoss ? 2 : 1;
    pressure += closeness * weight;
  }
  return Math.max(0, Math.min(1, pressure / 4.75));
}

function mixLinear(a, b, t) {
  return a + (b - a) * t;
}

function updateNpcFormationPressure(dt) {
  if (!formationState?.current || !npcs.length) return;
  const home = getNpcHomeBounds();
  if (!home) return;
  const targetPressure = computeNpcHomeThreatPressure();
  const currentPressure = Number.isFinite(formationState.homePressure)
    ? formationState.homePressure
    : 0;
  const nextPressure = mixLinear(currentPressure, targetPressure, Math.min(1, dt * 2.2));
  formationState.homePressure = nextPressure;
  const safeSpread = Number.isFinite(formationState.combatSpreadScale)
    ? formationState.combatSpreadScale
    : 1.18;
  const threatenedSpread = 0.58;
  const targetSpread = mixLinear(safeSpread, threatenedSpread, nextPressure);
  const currentSpread = Number.isFinite(formationState.combatSpreadScaleCurrent)
    ? formationState.combatSpreadScaleCurrent
    : safeSpread;
  formationState.combatSpreadScaleCurrent = mixLinear(
    currentSpread,
    targetSpread,
    Math.min(1, dt * 2.8),
  );
  const anchors = computeFormationAnchors(npcs.length);
  if (!anchors.length) return;
  const retargetThreshold = 24;
  npcs.forEach((npc, idx) => {
    const anchor = anchors[idx % anchors.length];
    if (!npc || !anchor) return;
    const prevAnchor = npc.formationAnchor || anchor;
    npc.formationAnchor = {
      x: mixLinear(prevAnchor.x, anchor.x, Math.min(1, dt * 3.5)),
      y: mixLinear(prevAnchor.y, anchor.y, Math.min(1, dt * 3.5)),
      angle: Number.isFinite(anchor.angle) ? anchor.angle : prevAnchor.angle,
      zoneHalfSpan: Number.isFinite(anchor.zoneHalfSpan) ? anchor.zoneHalfSpan : prevAnchor.zoneHalfSpan,
      zoneIndex: Number.isFinite(anchor.zoneIndex) ? anchor.zoneIndex : prevAnchor.zoneIndex,
      zoneCount: Number.isFinite(anchor.zoneCount) ? anchor.zoneCount : prevAnchor.zoneCount,
    };
    if (!npc.target) {
      assignNpcFrontlinePatrolTarget(npc);
      return;
    }
    const targetDx = npc.target.x - npc.formationAnchor.x;
    const targetDy = npc.target.y - npc.formationAnchor.y;
    const anchorShift = Math.hypot(anchor.x - prevAnchor.x, anchor.y - prevAnchor.y);
    const targetDistanceFromAnchor = Math.hypot(targetDx, targetDy);
    if (anchorShift > retargetThreshold || targetDistanceFromAnchor > home.radius * 0.7) {
      assignNpcFrontlinePatrolTarget(npc);
    }
  });
}

function getNpcAnchorRetreatPoint(npc, home, ratio = 0.42) {
  const anchor = npc?.formationAnchor || null;
  if (!anchor || !home) return { x: home.x, y: home.y };
  return {
    x: mixLinear(anchor.x, home.x, ratio),
    y: mixLinear(anchor.y, home.y, ratio),
  };
}

function getNpcThreatAvoidanceTarget(npc) {
  if (!npc || npc.departed || npc.state === "lostFaith" || npc.state === "departed") return null;
  const home = getNpcHomeBounds();
  if (!home) return null;
  let bestEnemy = null;
  let bestDistance = Infinity;
  for (const enemy of enemies) {
    if (!enemy || enemy.dead || enemy.state === "death") continue;
    const center = getEnemyHitboxCenter(enemy);
    const safeDistance =
      getEnemyHitboxRadius(enemy) +
      (npc.radius || NPC_RADIUS) +
      84;
    const dx = npc.x - center.x;
    const dy = npc.y - center.y;
    const distance = Math.hypot(dx, dy);
    if (distance > safeDistance || distance >= bestDistance) continue;
    bestDistance = distance;
    bestEnemy = { enemy, center, dx, dy, distance, safeDistance };
  }
  if (!bestEnemy) return null;
  const away = normalizeVector(bestEnemy.dx, bestEnemy.dy);
  const retreatCenter = getNpcAnchorRetreatPoint(npc, home, 0.46);
  const centerDir = normalizeVector(retreatCenter.x - npc.x, retreatCenter.y - npc.y);
  const retreatDir = normalizeVector(
    away.x * 0.35 + centerDir.x * 1.15,
    away.y * 0.35 + centerDir.y * 1.15,
  );
  const retreatDistance = Math.max(54, home.radius * 0.22);
  const targetX = npc.x + retreatDir.x * retreatDistance;
  const targetY = npc.y + retreatDir.y * retreatDistance;
  return clampPointToBounds(home, targetX, targetY);
}

function npcTargetNeedsUpdate(npc, target, minDelta = 18) {
  if (!npc || !target) return false;
  if (!npc.target) return true;
  const targetShift = Math.hypot((npc.target.x || 0) - target.x, (npc.target.y || 0) - target.y);
  if (targetShift >= minDelta) return true;
  const currentGap = Math.hypot((npc.x || 0) - target.x, (npc.y || 0) - target.y);
  return currentGap >= minDelta;
}

function pushPointOutsideNpcHome(x, y, padding = 28) {
  const homeBounds = getNpcHomeBounds();
  if (!homeBounds) return { x, y };
  const dx = x - homeBounds.x;
  const dy = y - homeBounds.y;
  if (Math.hypot(dx, dy) > homeBounds.radius) return { x, y };
  const angle = Math.atan2(dy, dx) || 0;
  const pushDist = homeBounds.radius + padding;
  return {
    x: homeBounds.x + Math.cos(angle) * pushDist,
    y: homeBounds.y + Math.sin(angle) * pushDist,
  };
}

function getActiveUtilityPowerUpCount() {
  return utilityPowerUps.filter((p) => p && !p.collected && !p.dead).length;
}

function canSpawnUtilityPowerUp() {
  return getActiveUtilityPowerUpCount() < 1 && powerUpRespawnTimer <= 0;
}

function getActiveChurchPowerupCount() {
  return churchPowerupPickups.filter((p) => p && !p.collected && !p.dead).length;
}

function canSpawnChurchPowerup() {
  return getActiveChurchPowerupCount() < 1 && powerUpRespawnTimer <= 0;
}

function getActiveWeaponPowerUpCount() {
  return weaponPickups.filter((pickup) => pickup && pickup.effect && isWeaponPowerEffect(pickup.effect)).length;
}

function canSpawnWeaponPowerUp() {
  return getActiveWeaponPowerUpCount() < 1 && powerUpRespawnTimer <= 0;
}

function triggerPowerUpCooldown() {
  powerUpRespawnTimer = POWERUP_REFILL_DELAY;
}

function clearAllPowerUps() {
  weaponPickups.forEach((pickup) => {
    if (!pickup) return;
    pickup.active = false;
    pickup.expired = true;
    pickup.visible = false;
    pickup.life = 0;
  });
  weaponPickups.splice(0, weaponPickups.length);
  churchPowerupPickups.forEach((pickup) => {
    if (!pickup) return;
    pickup.active = false;
    pickup.expired = true;
    pickup.visible = false;
    pickup.life = 0;
  });
  churchPowerupPickups.splice(0, churchPowerupPickups.length);
  utilityPowerUps.forEach((powerUp) => {
    if (!powerUp) return;
    powerUp.active = false;
    powerUp.expired = true;
    powerUp.visible = false;
    powerUp.life = 0;
  });
  utilityPowerUps.splice(0, utilityPowerUps.length);
  powerupHudFlyEffects.splice(0, powerupHudFlyEffects.length);
  powerUpRespawnTimer = 0;
  powerUpStaggerTimer = 0;
  churchPowerupEnsureTimer = 0;
  queuedPowerUpDrops = 0;
}

function resetChurchPowerups() {
  unlockedChurchPowerups.clear();
  churchPowerupLevels.clear();
  churchPowerupPickups.splice(0, churchPowerupPickups.length);
}

function clearGracePickups() {
  gracePickups.splice(0, gracePickups.length);
  graceHudFlyEffects.splice(0, graceHudFlyEffects.length);
}

function getGraceCount() {
  return playerGraceCount;
}

let npcHarmonyBuffTimer = 0;
let npcHarmonyBuffDuration = 0;
const HARMONY_BUFF_MULTIPLIER = 2.25;

function addGrace(amount = 1) {
  if (!Number.isFinite(amount) || amount === 0) return playerGraceCount;
  playerGraceCount = Math.max(0, Math.round(playerGraceCount + amount));
  return playerGraceCount;
}
if (typeof window !== "undefined") {
  window.getGraceCount = getGraceCount;
  window.addGrace = addGrace;
}

const CHURCH_POWERUP_MAX_LEVEL = 10;

function getChurchPowerupLevelCost(def, level) {
  // level is the CURRENT level (0-9); returns cost to purchase the next level
  const costs = Array.isArray(def?.levelCosts) ? def.levelCosts : [];
  return Number.isFinite(costs[level]) ? costs[level] : (Number.isFinite(def?.cost) ? def.cost : 40);
}

// Returns the active duration for a church powerup instance given level and instance (1=primary, 2=secondary).
// Levels 1-5: single instance, duration scales 40%→100% of base (4s→10s for base 10).
// Levels 6-10: primary at full duration; secondary scales 40%→100% of base.
function getChurchPowerupInstanceDuration(baseDuration, level, instance) {
  const minFrac = 0.4;
  if (instance === 1) {
    if (level >= 5) return baseDuration;
    const t = (level - 1) / 4;
    return baseDuration * (minFrac + (1 - minFrac) * t);
  }
  if (level < 6) return 0;
  if (level >= 10) return baseDuration;
  const t = (level - 6) / 4;
  return baseDuration * (minFrac + (1 - minFrac) * t);
}

function getChurchPowerupOptions() {
  return Object.entries(CHURCH_POWERUP_DEFS).map(([key, def]) => {
    const level = churchPowerupLevels.get(key) || 0;
    const maxLevel = CHURCH_POWERUP_MAX_LEVEL;
    const detail = def.disabled ? "Coming soon" : "";
    return {
      key,
      label: def.label || key,
      description: def.description || "",
      weaponName: def.weaponName || "",
      cost: getChurchPowerupLevelCost(def, level),
      iconSrc: def.iconSrc || def.src || null,
      detail,
      disabled: Boolean(def.disabled),
      owned: level > 0,
      level,
      maxLevel,
    };
  });
}

function unlockChurchPowerup(key) {
  if (!key || !CHURCH_POWERUP_DEFS[key] || CHURCH_POWERUP_DEFS[key].disabled) return false;
  const level = churchPowerupLevels.get(key) || 0;
  if (level >= CHURCH_POWERUP_MAX_LEVEL) return false;
  const nextLevel = level + 1;
  churchPowerupLevels.set(key, nextLevel);
  if (nextLevel >= 1) unlockedChurchPowerups.add(key);
  return true;
}

function refundChurchPowerup(key) {
  const def = CHURCH_POWERUP_DEFS[key];
  if (!def || def.disabled) return false;
  const level = churchPowerupLevels.get(key) || 0;
  if (level <= 0) return false;
  const nextLevel = level - 1;
  churchPowerupLevels.set(key, nextLevel);
  if (nextLevel <= 0) unlockedChurchPowerups.delete(key);
  // Refund the cost that was paid for this level (levelCosts is 0-indexed by level before purchase)
  const cost = getChurchPowerupLevelCost(def, level - 1);
  addGrace(cost);
  return true;
}

function purchaseChurchPowerup(key) {
  const def = CHURCH_POWERUP_DEFS[key];
  if (!def || def.disabled) return false;
  const level = churchPowerupLevels.get(key) || 0;
  if (level >= CHURCH_POWERUP_MAX_LEVEL) return false;
  const cost = getChurchPowerupLevelCost(def, level);
  if (getGraceCount() < cost) return false;
  addGrace(-cost);
  return unlockChurchPowerup(key);
}

if (typeof window !== "undefined") {
  window.ChurchPowerups = {
    getOptions: getChurchPowerupOptions,
    purchase: purchaseChurchPowerup,
    refund: refundChurchPowerup,
    reset: resetChurchPowerups,
  };
}

function startBattleGraceRush(duration = GRACE_RUSH_DURATION, options = {}) {
  // Always start from a clean grace-rush visual state so one battle's
  // end-fade/blackout cannot leak into the next battle rush.
  graceRushFadeTimer = 0;
  graceRushFadeDuration = 0;
  graceRushFadeAlpha = 0;
  graceRushFadeHold = false;
  graceRushFadeReleaseTimer = 0;
  graceRushBlackout = false;
  graceRushHardBlackoutTimer = 0;

  graceRushState.active = true;
  graceRushState.timer = Math.max(0, duration);
  graceRushState.duration = Math.max(0, duration);
  graceRushState.elapsed = 0;
  graceRushState.reason = options.reason || "battle";
  graceRushState.burstAmount = Math.max(1, Math.round(options.burstAmount ?? (graceRushState.reason === "boss" ? 26 : 16)));
  graceRushState.spawnInterval = Math.max(
    0.2,
    Number.isFinite(options.spawnInterval) ? options.spawnInterval : graceRushState.reason === "boss" ? 0.65 : 1.1,
  );
  graceRushState.spawnTimer = 0;
  graceRushState.centerX = Number.isFinite(options.centerX) ? options.centerX : null;
  graceRushState.centerY = Number.isFinite(options.centerY) ? options.centerY : null;
  prepareGraceRushNpcFarewellQueue();
  lastEnemyDeathPosition = null;
}

function updateGraceRushState(dt) {
  if (!graceRushState.active) return;
  const levelStatus = levelManager?.getStatus ? levelManager.getStatus() : null;
  if (levelStatus?.stage !== "graceRush") {
    graceRushState.active = false;
    graceRushState.timer = 0;
    graceRushState.elapsed = 0;
    graceRushState.spawnTimer = 0;
    graceRushState.centerX = null;
    graceRushState.centerY = null;
    resetGraceRushNpcFarewellState({ resetAlpha: false });
    return;
  }
  graceRushState.elapsed = Math.max(0, graceRushState.elapsed + dt);
  graceRushState.timer = Math.max(0, graceRushState.timer - dt);
  graceRushState.spawnTimer = (graceRushState.spawnTimer || 0) - dt;
  if (graceRushState.reason !== "boss") {
    // Non-boss NPC fades are now driven by each NPC's spoken-line timer
    // (see updateBattleVictoryNpcDialogue + updateCozyNpcs).
  } else {
    resetGraceRushNpcFarewellState({ resetAlpha: false });
  }
  if (graceRushState.spawnTimer <= 0) {
    spawnVictoryGraceBurst({
      reason: graceRushState.reason,
      amount: graceRushState.burstAmount,
      centerX: graceRushState.centerX,
      centerY: graceRushState.centerY,
    });
    graceRushState.spawnTimer = graceRushState.spawnInterval;
  }
  if (graceRushState.timer <= 0) {
    graceRushState.active = false;
    graceRushState.timer = 0;
    graceRushState.elapsed = 0;
    graceRushState.spawnTimer = 0;
    graceRushState.centerX = null;
    graceRushState.centerY = null;
    resetGraceRushNpcFarewellState({ resetAlpha: false });
  }
}

function getLastEnemyDeathPosition() {
  if (!lastEnemyDeathPosition) return null;
  return { ...lastEnemyDeathPosition };
}

let projectileFrames = {};
const assetSrcResolutionCache = new Map();

let paused = false;

let spawnTimer = 0;
let gameOver = false;
let lastTime = performance.now();
let gameLoopStarted = false;
let gameLoopHandle = null;
paused = true;
let hpFlashTimer = 0;
let hitFreezeTimer = 0;
let cameraShakeTimer = 0;
let cameraShakeMagnitude = 0;
let bossLightningFlashAlpha = 0;
const BOSS_LIGHTNING_ATMO_MIN_INTERVAL = 3.6;
const BOSS_LIGHTNING_ATMO_MAX_INTERVAL = 8.2;
const BOSS_LIGHTNING_ATMO_FLASH_DURATION = 0.24;
const BOSS_LIGHTNING_ATMO_FLASH_MIN_INTENSITY = 0.12;
const BOSS_LIGHTNING_ATMO_FLASH_MAX_INTENSITY = 0.24;
const BOSS_LIGHTNING_ATMO_SHAKE_DURATION = 0.12;
const BOSS_LIGHTNING_ATMO_SHAKE_MIN = 1.8;
const BOSS_LIGHTNING_ATMO_SHAKE_MAX = 3.4;
const BOSS_LIGHTNING_ATMO_ECHO_CHANCE = 0.34;
const BOSS_LIGHTNING_ATMO_ECHO_MIN_DELAY = 0.1;
const BOSS_LIGHTNING_ATMO_ECHO_MAX_DELAY = 0.22;
const bossLightningAtmosphere = {
  active: false,
  nextStrikeTimer: 0,
  echoTimer: 0,
  flashTimer: 0,
  flashDuration: BOSS_LIGHTNING_ATMO_FLASH_DURATION,
  flashIntensity: 0,
};

function getBossLightningRandomInterval() {
  return (
    BOSS_LIGHTNING_ATMO_MIN_INTERVAL +
    Math.random() * Math.max(0.001, BOSS_LIGHTNING_ATMO_MAX_INTERVAL - BOSS_LIGHTNING_ATMO_MIN_INTERVAL)
  );
}

function queueBossLightningStrike() {
  const intensity =
    BOSS_LIGHTNING_ATMO_FLASH_MIN_INTENSITY +
    Math.random() * Math.max(0.001, BOSS_LIGHTNING_ATMO_FLASH_MAX_INTENSITY - BOSS_LIGHTNING_ATMO_FLASH_MIN_INTENSITY);
  bossLightningAtmosphere.flashDuration = BOSS_LIGHTNING_ATMO_FLASH_DURATION;
  bossLightningAtmosphere.flashTimer = BOSS_LIGHTNING_ATMO_FLASH_DURATION;
  bossLightningAtmosphere.flashIntensity = intensity;
  const shakeMag =
    BOSS_LIGHTNING_ATMO_SHAKE_MIN +
    Math.random() * Math.max(0.001, BOSS_LIGHTNING_ATMO_SHAKE_MAX - BOSS_LIGHTNING_ATMO_SHAKE_MIN);
  applyCameraShake(BOSS_LIGHTNING_ATMO_SHAKE_DURATION, shakeMag);
  playBossLightningThunderSfx(0.5 + Math.random() * 0.16);
}

function resetBossLightningAtmosphere() {
  bossLightningAtmosphere.active = false;
  bossLightningAtmosphere.nextStrikeTimer = 0;
  bossLightningAtmosphere.echoTimer = 0;
  bossLightningAtmosphere.flashTimer = 0;
  bossLightningAtmosphere.flashIntensity = 0;
  bossLightningFlashAlpha = 0;
}

function updateBossLightningAtmosphere(dt) {
  const levelStatus = levelManager?.getStatus ? levelManager.getStatus() : null;
  const stage = levelStatus?.stage || "";
  const bossAtmosphereActive = stage === "bossIntro" || stage === "bossActive";
  if (!bossAtmosphereActive) {
    resetBossLightningAtmosphere();
    return;
  }
  if (paused) return;
  if (!bossLightningAtmosphere.active) {
    bossLightningAtmosphere.active = true;
    bossLightningAtmosphere.nextStrikeTimer = 1.8 + Math.random() * 2.2;
    bossLightningAtmosphere.echoTimer = 0;
  }
  bossLightningAtmosphere.nextStrikeTimer = Math.max(0, bossLightningAtmosphere.nextStrikeTimer - dt);
  if (bossLightningAtmosphere.nextStrikeTimer <= 0) {
    queueBossLightningStrike();
    bossLightningAtmosphere.nextStrikeTimer = getBossLightningRandomInterval();
    bossLightningAtmosphere.echoTimer =
      Math.random() < BOSS_LIGHTNING_ATMO_ECHO_CHANCE
        ? BOSS_LIGHTNING_ATMO_ECHO_MIN_DELAY +
          Math.random() * Math.max(0.001, BOSS_LIGHTNING_ATMO_ECHO_MAX_DELAY - BOSS_LIGHTNING_ATMO_ECHO_MIN_DELAY)
        : 0;
  }
  if (bossLightningAtmosphere.echoTimer > 0) {
    bossLightningAtmosphere.echoTimer = Math.max(0, bossLightningAtmosphere.echoTimer - dt);
    if (bossLightningAtmosphere.echoTimer <= 0) {
      queueBossLightningStrike();
    }
  }
  if (bossLightningAtmosphere.flashTimer > 0) {
    bossLightningAtmosphere.flashTimer = Math.max(0, bossLightningAtmosphere.flashTimer - dt);
    const t =
      bossLightningAtmosphere.flashDuration > 0
        ? bossLightningAtmosphere.flashTimer / bossLightningAtmosphere.flashDuration
        : 0;
    const eased = Math.max(0, Math.min(1, t * t));
    bossLightningFlashAlpha = bossLightningAtmosphere.flashIntensity * eased;
  } else {
    bossLightningFlashAlpha = 0;
  }
}

function applyCameraShake(duration, magnitude) {
  if (duration <= 0 || magnitude <= 0) return;
  if (cameraShakeTimer <= 0 || magnitude > cameraShakeMagnitude) {
    cameraShakeTimer = Math.max(cameraShakeTimer, duration);
    cameraShakeMagnitude = magnitude;
  }
}
// per-layer pan values used by drawBackground
let backgroundPan = { far: { x: 0 }, mid: { x: 0 } };
const devFrameCache = new Map(); // cache extracted frames per clip
let canvasScale = 1;

FloatingText.initialize({
  getPlayer: () => player,
  maxSpeechBubbles: 10,
});

const floatingTexts = FloatingText.getActive();
const addFloatingText = FloatingText.add;
const addFloatingTextAt = FloatingText.addAt;
const showDamage = FloatingText.showDamage;
const heroSay = FloatingText.heroSay;
const npcCheer = FloatingText.npcCheer;
const addStatusText = FloatingText.addStatusText;
const updateFloatingTexts = FloatingText.update;

function showWaveHealthSnapshot() {
  if (player && player.state !== "death" && Number.isFinite(player.health)) {
    heroSay(`HP ${Math.max(0, Math.round(player.health))}`, { life: 5.0 });
  }

  const formationLabel =
    FORMATION_PRESETS?.[formationState?.current]?.label || "formation";
  const waveEndConfig = CONGREGATION_WAVE_END_DIALOGUE;
  const eligibleNpcs = npcs.filter(
    (npc) =>
      npc &&
      !npc.departed &&
      npc.active &&
      npc.state !== "lostFaith" &&
      Number.isFinite(npc.faith),
  );
  if (!eligibleNpcs.length) return;

  const buckets = {
    full: [],
    high: [],
    mid: [],
    low: [],
    critical: [],
  };
  eligibleNpcs.forEach((npc) => {
    const faith = Math.max(0, Math.round(npc.faith || 0));
    if (faith >= 100) {
      buckets.full.push(npc);
    } else if (faith >= 81) {
      buckets.high.push(npc);
    } else if (faith >= 50) {
      buckets.mid.push(npc);
    } else if (faith >= 30) {
      buckets.low.push(npc);
    } else if (faith >= 1) {
      buckets.critical.push(npc);
    }
  });

  const linesByTier = waveEndConfig.linesByTier || {};
  const maxSpeakers = Math.max(1, Math.round(waveEndConfig.maxSpeakers || 5));
  const longLineLife = Math.max(0.1, Number(waveEndConfig.longLineLife) || 6.2);
  const shortLineLife = Math.max(0.1, Number(waveEndConfig.shortLineLife) || 5.4);

  const speakers = [];
  const speakerSet = new Set();
  const addSpeaker = (npc, line, life = shortLineLife) => {
    if (!npc || !line || speakerSet.has(npc)) return;
    speakers.push({ npc, line, life });
    speakerSet.add(npc);
  };

  if (buckets.full.length) {
    const longLineNpc = randomChoice(buckets.full);
    const faith = Math.max(0, Math.round(longLineNpc.faith || 0));
    const longLine =
      typeof waveEndConfig.longLine === "function"
        ? waveEndConfig.longLine(faith, formationLabel)
        : `${faith}: This ${formationLabel} is really helping me.`;
    addSpeaker(longLineNpc, longLine, longLineLife);
  }

  const tierOrder = Array.isArray(waveEndConfig.tierOrder)
    ? waveEndConfig.tierOrder
    : ["full", "high", "mid", "low", "critical"];
  tierOrder.forEach((tier) => {
    if (speakers.length >= maxSpeakers) return;
    const candidates = buckets[tier].filter((npc) => !speakerSet.has(npc));
    if (!candidates.length) return;
    const npc = randomChoice(candidates);
    if (!npc) return;
    const faith = Math.max(0, Math.round(npc.faith || 0));
    const tierLines = Array.isArray(linesByTier[tier]) ? linesByTier[tier] : [];
    const lineFactory = randomChoice(tierLines);
    addSpeaker(npc, typeof lineFactory === "function" ? lineFactory(faith) : null);
  });

  if (speakers.length < maxSpeakers) {
    const leftovers = eligibleNpcs.filter((npc) => !speakerSet.has(npc));
    while (speakers.length < maxSpeakers && leftovers.length) {
      const npc = leftovers.splice(Math.floor(Math.random() * leftovers.length), 1)[0];
      const faith = Math.max(0, Math.round(npc.faith || 0));
      const tier =
        faith >= 100 ? "full" :
        faith >= 81 ? "high" :
        faith >= 50 ? "mid" :
        faith >= 30 ? "low" :
        "critical";
      const tierLines = Array.isArray(linesByTier[tier]) ? linesByTier[tier] : [];
      const lineFactory = randomChoice(tierLines);
      addSpeaker(npc, typeof lineFactory === "function" ? lineFactory(faith) : null);
    }
  }

  speakers.forEach(({ npc, line, life }) => {
    npcCheer(npc, line, "#f4fbff", { life });
  });
}

function getCongregationConversationResponders() {
  const activeNpcs = npcs.filter(
    (npc) => npc && !npc.departed && npc.active && npc.state !== "lostFaith" && npc.state !== "drained",
  );
  if (activeNpcs.length) return activeNpcs;
  return congregationMembers.filter(
    (member) =>
      member &&
      !member.departed &&
      member.state !== "lostFaith" &&
      member.state !== "drained" &&
      Number.isFinite(member.x) &&
      Number.isFinite(member.y),
  );
}

function resetCongregationWaveIntroDialogueState() {
  congregationWaveIntroDialogueState.activeKey = "";
  congregationWaveIntroDialogueState.queue.length = 0;
  congregationWaveIntroDialogueState.firstResponder = null;
}

function queueCongregationWaveIntroDialogue(levelStatus) {
  const firstWaveIntro = CONGREGATION_WAVE_INTRO_DIALOGUE.firstWave || {};
  const pastorLine = firstWaveIntro.pastor || null;
  const responses = Array.isArray(firstWaveIntro.responses) ? firstWaveIntro.responses : [];
  const key = [
    levelStatus?.level || 0,
    levelStatus?.battle || 0,
    levelStatus?.wave || 0,
  ].join(":");
  if (!key) return;
  congregationWaveIntroDialogueState.activeKey = key;
  congregationWaveIntroDialogueState.queue.length = 0;
  congregationWaveIntroDialogueState.firstResponder = null;
  const formationLabel = getCurrentFormationDialogueLabel();
  const pastorText =
    typeof pastorLine?.text === "function"
      ? pastorLine.text(formationLabel)
      : pastorLine?.text;
  if (pastorText) {
    congregationWaveIntroDialogueState.queue.push({
      delay: Math.max(0, Number(pastorLine.delay) || 0.35),
      run() {
        heroSay(pastorText, { life: Number(pastorLine.life) || 2.6 });
      },
    });
  }
  if (responses[0]?.text) {
    congregationWaveIntroDialogueState.queue.push({
      delay: Math.max(0, Number(responses[0].delay) || 1.35),
      run() {
        const available = getCongregationConversationResponders();
        if (!available.length) return;
        const npc = randomChoice(available);
        if (!npc) return;
        congregationWaveIntroDialogueState.firstResponder = npc;
        npcCheer(npc, responses[0].text, "#f4fbff", {
          life: Number(responses[0].life) || 3.2,
        });
      },
    });
  }
  if (responses[1]?.text) {
    congregationWaveIntroDialogueState.queue.push({
      delay: Math.max(0, Number(responses[1].delay) || 2.45),
      run() {
        const available = getCongregationConversationResponders();
        if (!available.length) return;
        const candidates =
          available.length > 1 && congregationWaveIntroDialogueState.firstResponder
            ? available.filter((npc) => npc !== congregationWaveIntroDialogueState.firstResponder)
            : available;
        const npc = randomChoice(candidates);
        if (!npc) return;
        npcCheer(npc, responses[1].text, "#f4fbff", {
          life: Number(responses[1].life) || 3.6,
        });
      },
    });
  }
}

function updateCongregationWaveIntroDialogue(dt, levelStatus) {
  const stage = levelStatus?.stage || "";
  const waveNumber = Number(levelStatus?.wave) || 0;
  if (stage !== "waveIntro" || waveNumber !== 1) {
    if (congregationWaveIntroDialogueState.activeKey) {
      resetCongregationWaveIntroDialogueState();
    }
    return;
  }
  const currentKey = [
    levelStatus?.level || 0,
    levelStatus?.battle || 0,
    waveNumber,
  ].join(":");
  if (congregationWaveIntroDialogueState.activeKey !== currentKey) {
    queueCongregationWaveIntroDialogue(levelStatus);
  }
  for (let i = 0; i < congregationWaveIntroDialogueState.queue.length; ) {
    const event = congregationWaveIntroDialogueState.queue[i];
    event.delay -= dt;
    if (event.delay <= 0) {
      try {
        event.run();
      } catch (error) {
        console.error("Congregation wave intro dialogue failed", error);
      }
      congregationWaveIntroDialogueState.queue.splice(i, 1);
    } else {
      i += 1;
    }
  }
}

function getCurrentFormationDialogueLabel() {
  const preset = FORMATION_PRESETS?.[formationState?.current] || null;
  return preset?.spokenLabel || preset?.label || "group";
}

function getNpcRedFaithThresholdRatio() {
  const threshold = Number(CONGREGATION_RED_FAITH_DIALOGUE.thresholdRatio);
  return Number.isFinite(threshold) ? Math.max(0, Math.min(1, threshold)) : 0.33;
}

function getNpcRedFaithDialogueLine() {
  const candidates = Array.isArray(CONGREGATION_RED_FAITH_DIALOGUE.lines)
    ? CONGREGATION_RED_FAITH_DIALOGUE.lines
    : [];
  const lineFactory = randomChoice(candidates);
  if (typeof lineFactory === "function") {
    return lineFactory(getCurrentFormationDialogueLabel());
  }
  return lineFactory || null;
}

function getNpcRedFaithDialogueLife() {
  const life = Number(CONGREGATION_RED_FAITH_DIALOGUE.life);
  return Number.isFinite(life) ? Math.max(0.1, life) : 5.8;
}

function getNpcPowerupDialogueSpeaker() {
  const activeNpcs = npcs.filter(
    (npc) =>
      npc &&
      !npc.departed &&
      npc.active &&
      npc.state !== "lostFaith" &&
      npc.state !== "drained" &&
      Number.isFinite(npc.x) &&
      Number.isFinite(npc.y),
  );
  return activeNpcs.length ? randomChoice(activeNpcs) : null;
}

const NPC_POWERUP_EFFECT_NAMES = {
  npcScriptureWeapon: "Scripture",
  npcWisdomWeapon: "Wisdom",
  npcFaithWeapon: "Faith",
  harmony: "Encouragement",
};

function triggerNpcPowerupDialogue(effectKey) {
  const name = NPC_POWERUP_EFFECT_NAMES[effectKey];
  if (!name) return false;
  const speaker = getNpcPowerupDialogueSpeaker();
  if (!speaker) return false;
  npcCheer(speaker, name, "#f4fbff", { life: 3.2 });
  return true;
}

function showBattleVictoryNpcDialogue() {
  const responders = getCongregationConversationResponders().slice();
  if (!responders.length) return false;
  const helpedLineCount = 3;
  const goodbyeLineCount = 2;
  const speakerCount = helpedLineCount + goodbyeLineCount;
  const life = 5.6;
  const fadeDelay = 4.1;
  const initialPostKillDelay = 2.0;
  const helpedStaggerStep = 0.75;
  const goodbyeStartDelay = 0.4;
  const goodbyeStaggerStep = 0.5;
  const speakerCycle = responders.slice().sort(() => Math.random() - 0.5);
  let speakerCursor = 0;
  const usedHelped = new Set();
  const usedGoodbyes = new Set();
  battleVictoryDialogueState.queue.length = 0;
  for (let i = 0; i < speakerCount; i += 1) {
    const speaker = speakerCycle[speakerCursor % speakerCycle.length];
    speakerCursor += 1;
    if (!speaker) continue;
    const isHelpedLine = i < helpedLineCount;
    const line =
      isHelpedLine
        ? (() => {
            const available = VICTORY_OPENING_LINES.filter((text) => !usedHelped.has(text));
            const pool = available.length ? available : VICTORY_OPENING_LINES;
            const selected = pool[Math.floor(Math.random() * pool.length)];
            usedHelped.add(selected);
            return selected;
          })()
        : (() => {
            const available = GRACE_RUSH_FAREWELL_LINES.filter((text) => !usedGoodbyes.has(text));
            const pool = available.length ? available : GRACE_RUSH_FAREWELL_LINES;
            const selected = pool[Math.floor(Math.random() * pool.length)];
            usedGoodbyes.add(selected);
            return selected;
          })();
    const helpedPhaseEnd =
      initialPostKillDelay + Math.max(0, (helpedLineCount - 1) * helpedStaggerStep);
    const delay = isHelpedLine
      ? initialPostKillDelay + i * helpedStaggerStep
      : helpedPhaseEnd + goodbyeStartDelay + (i - helpedLineCount) * goodbyeStaggerStep;
    battleVictoryDialogueState.queue.push({
      delay,
      speaker,
      line,
      life,
      fadeDelay,
    });
  }
  return battleVictoryDialogueState.queue.length > 0;
}

function updateBattleVictoryNpcDialogue(dt) {
  for (let i = 0; i < battleVictoryDialogueState.queue.length; i += 1) {
    const event = battleVictoryDialogueState.queue[i];
    event.delay -= dt;
  }
  const readyIndex = battleVictoryDialogueState.queue.findIndex((event) => event.delay <= 0);
  if (readyIndex >= 0) {
    const [event] = battleVictoryDialogueState.queue.splice(readyIndex, 1);
    const now =
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();
    if (event.speaker) {
      event.speaker.graceRushNpcFadeStartAt = now + Math.max(0, (event.fadeDelay || 0) * 1000);
      event.speaker.graceRushNpcFadeDurationMs = 1200;
      event.speaker.graceRushNpcFadeAlpha = 1;
    }
    npcCheer(event.speaker, event.line, "#f4fbff", {
      life: event.life,
      fadeDelay: event.fadeDelay || 0,
      vy: 0,
    });
  }
}

Effects.initialize({
  context: ctx,
  getAssets: () => assets,
});

const updateEffects = Effects.update;
const spawnImpactEffect = Effects.spawnImpactEffect;
const spawnFlashEffect = Effects.spawnFlashEffect;
const spawnSentryBurnEffect = Effects.spawnSentryBurnEffect;
const spawnSentryBeamHitEffect = Effects.spawnSentryBeamHitEffect;
const spawnSentryBoreKillEffect = Effects.spawnSentryBoreKillEffect;
const spawnMagicImpactEffect = Effects.spawnMagicImpactEffect;
const spawnVisitorHeartHitEffect = Effects.spawnVisitorHeartHitEffect;
const spawnBossProjectilePuffEffect = Effects.spawnBossProjectilePuffEffect;
const spawnChattyHeartHitEffect = Effects.spawnChattyHeartHitEffect;
const spawnChattyAppeaseEffect = Effects.spawnChattyAppeaseEffect;
const spawnMagicSplashEffect = Effects.spawnMagicSplashEffect;
const spawnSplashDebugCircle = Effects.spawnSplashDebugCircle;
const spawnPuffEffect = Effects.spawnPuffEffect;
const spawnSmokeEffect = Effects.spawnSmokeEffect;
const spawnImpactDustEffect = Effects.spawnImpactDustEffect;
const spawnRayboltEffect = Effects.spawnRayboltEffect;
const spawnPrayerBombGlow = Effects.spawnPrayerBombGlow;
const spawnPrayerBombExplosion = Effects.spawnPrayerBombExplosion;
const spawnEnemyDeathExplosion = Effects.spawnEnemyDeathExplosion;

function triggerPrayerBombExplosionAt(x, y, radius, damage) {
  if (typeof spawnPrayerBombExplosion === "function") {
    spawnPrayerBombExplosion(x, y, { radius });
  }
  applyPrayerBombDamageAt(x, y, radius, damage);
}

function applyPrayerBombDamageAt(x, y, radius, damage, { bossScale = PRAYER_BOMB_BOSS_DAMAGE_SCALE } = {}) {
  const hits = [];
  enemies.forEach((enemy) => {
    if (!enemy || enemy.dead || enemy.state === "death") return;
    const hitRadius = getEnemyHitboxRadius(enemy);
    const center = getEnemyHitboxCenter(enemy);
    const distance = Math.hypot(center.x - x, center.y - y);
    if (distance <= radius + hitRadius * 0.8) {
      enemy.takeDamage(damage);
      if (enemy.dead || enemy.state === "death" || (Number.isFinite(enemy.health) && enemy.health <= 0)) {
        enemy.killedByPrayerBomb = true;
      }
      hits.push(enemy);
    }
  });
  let bossHit = false;
  if (typeof activeBoss !== "undefined" && activeBoss && !activeBoss.dead && activeBoss.state !== "death") {
    const bossRadius = activeBoss.radius || 0;
    const bossDistance = Math.hypot(activeBoss.x - x, activeBoss.y - y);
    if (bossDistance <= radius + bossRadius * 0.8) {
      activeBoss.takeDamage(damage * bossScale);
      bossHit = true;
    }
  }
  if (prayerBombComboState.active) {
    const hitCount = hits.length + (bossHit ? 1 : 0);
    recordPrayerBombComboHits(hitCount);
  }
  return { hits, bossHit };
}

function startPrayerBombFireRain(duration = PRAYER_BOMB_RAIN_DURATION) {
  const castDuration = Math.max(0, Number(duration) || 0);
  prayerBombRainTimer = Math.max(prayerBombRainTimer, castDuration);
  prayerBombRainSpawnTimer = 0;
  prayerStormGroundFireTargetThisCast =
    PRAYER_STORM_GROUND_FIRE_TARGET_MIN +
    Math.floor(
      Math.random() *
        (PRAYER_STORM_GROUND_FIRE_TARGET_MAX - PRAYER_STORM_GROUND_FIRE_TARGET_MIN + 1),
    );
  prayerStormGroundFireSpawnedThisCast = 0;
  prayerStormRainImpactCountThisCast = 0;
  const estimatedImpacts = Math.max(
    1,
    Math.ceil(castDuration / Math.max(0.001, PRAYER_BOMB_RAIN_INTERVAL)) * 2,
  );
  prayerStormGroundFireImpactSpacing = Math.max(
    1,
    estimatedImpacts / Math.max(1, prayerStormGroundFireTargetThisCast),
  );
  prayerStormGroundFireNextSpawnAtImpact = Math.max(
    1,
    prayerStormGroundFireImpactSpacing * 0.5,
  );
  startPrayerBombCombo();
}

function triggerPrayerBombScreenDarken(duration = 0.8) {
  const safeDuration = Math.max(0.2, Number(duration) || 0.8);
  prayerBombScreenFadeDuration = safeDuration;
  prayerBombScreenFadeTimer = Math.max(prayerBombScreenFadeTimer, safeDuration);
}

function handlePrayerBombRainImpact() {
  triggerPrayerBombScreenDarken(PRAYER_BOMB_RAIN_DARKEN_DURATION);
  applyCameraShake(PRAYER_BOMB_RAIN_SHAKE_DURATION, PRAYER_BOMB_RAIN_SHAKE_MAGNITUDE);
}

function maybeSpawnPrayerStormGroundFire(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  if (prayerStormGroundFireSpawnedThisCast >= prayerStormGroundFireTargetThisCast) return;
  prayerStormRainImpactCountThisCast += 1;
  if (prayerStormRainImpactCountThisCast < prayerStormGroundFireNextSpawnAtImpact) return;
  const fireSets = assets?.effects?.prayerStormGroundFire || [];
  let frames = null;
  if (Array.isArray(fireSets) && fireSets.length) {
    frames = fireSets[Math.floor(Math.random() * fireSets.length)] || null;
  }
  const getUWallSpawnPoint = () => {
    const home = getNpcHomeBounds();
    if (!home) return { x, y };
    const spanX = Math.max(1, home.maxX - home.minX);
    const spanY = Math.max(1, home.maxY - home.minY);
    const sideRoll = Math.random();
    const bottomBias = 0.40;
    const sideInsetX = spanX * 0.1;
    const sideInsetY = spanY * 0.12;
    const wallOffsetMin = Math.max(18, 26 * WORLD_SCALE);
    const wallOffsetMax = Math.max(wallOffsetMin + 10, 72 * WORLD_SCALE);
    let sx = x;
    let sy = y;
    if (sideRoll < (1 - bottomBias) * 0.5) {
      // Left wall
      sx = home.minX - randomInRange(wallOffsetMin, wallOffsetMax);
      sy = randomInRange(home.minY + sideInsetY, home.maxY - sideInsetY * 0.65);
    } else if (sideRoll < (1 - bottomBias)) {
      // Right wall
      sx = home.maxX + randomInRange(wallOffsetMin, wallOffsetMax);
      sy = randomInRange(home.minY + sideInsetY, home.maxY - sideInsetY * 0.65);
    } else {
      // Bottom wall
      sx = randomInRange(home.minX + sideInsetX, home.maxX - sideInsetX);
      sy = home.maxY + randomInRange(wallOffsetMin, wallOffsetMax);
    }
    // Keep this effect explicitly out of the "north/top" side of the home base.
    sy = Math.max(home.minY + sideInsetY, sy);
    const dx = sx - home.x;
    const dy = sy - home.y;
    const dist = Math.hypot(dx, dy);
    const minDist = home.radius + Math.max(14, 18 * WORLD_SCALE);
    if (dist < minDist) {
      const angle = Math.atan2(dy, dx);
      sx = home.x + Math.cos(angle) * minDist;
      sy = home.y + Math.sin(angle) * minDist;
    }
    return {
      x: Math.max(8, Math.min(canvas.width - 8, sx)),
      y: Math.max(HUD_HEIGHT + 8, Math.min(canvas.height - 8, sy)),
    };
  };
  const spawnPoint = getUWallSpawnPoint();
  prayerStormGroundFires.push({
    x: spawnPoint.x,
    y: spawnPoint.y,
    life: PRAYER_STORM_GROUND_FIRE_DURATION,
    duration: PRAYER_STORM_GROUND_FIRE_DURATION,
    fadeDuration: PRAYER_STORM_GROUND_FIRE_FADE_DURATION,
    frameTimer: 0,
    frameIndex: Math.floor(Math.random() * 14),
    frameDuration: PRAYER_STORM_GROUND_FIRE_FRAME_DURATION,
    frames,
    radius: PRAYER_STORM_GROUND_FIRE_RADIUS,
    scale: PRAYER_STORM_GROUND_FIRE_SCALE,
    damage: PRAYER_STORM_GROUND_FIRE_DAMAGE,
    bossDamage: PRAYER_STORM_GROUND_FIRE_BOSS_DAMAGE,
    hitCooldown: PRAYER_STORM_GROUND_FIRE_HIT_COOLDOWN,
    hitMap: new WeakMap(),
  });
  prayerStormGroundFireSpawnedThisCast += 1;
  prayerStormGroundFireNextSpawnAtImpact += prayerStormGroundFireImpactSpacing;
}

function spawnPrayerBombFireball(target) {
  if (!target) return;
  const startY = HUD_HEIGHT + 8;
  const startX = target.x + randomInRange(-40, 40);
  const dx = target.x - startX;
  const dy = target.y - startY;
  const dir = normalizeVector(dx, dy);
  const speed = 900 * WORLD_SCALE;
  const travel = Math.max(40, Math.hypot(dx, dy));
  const life = travel / speed;
  const proj = spawnProjectile("fire", startX, startY, dir.x, dir.y, {
    speed,
    life,
    damage: 0,
    radius: 18,
    scale: 2.6,
    loopFrames: true,
    pierce: false,
    friendly: true,
    onImpact: (proj) => {
      if (typeof window !== "undefined" && typeof window.playPrayerBombRainSfx === "function") {
        window.playPrayerBombRainSfx(0.75);
      }
      handlePrayerBombRainImpact();
      triggerPrayerBombExplosionAt(proj.x, proj.y, PRAYER_BOMB_RAIN_RADIUS, PRAYER_BOMB_LEVEL3_DAMAGE);
      maybeSpawnPrayerStormGroundFire(proj.x, proj.y);
    },
    onExpire: (proj) => {
      if (typeof window !== "undefined" && typeof window.playPrayerBombRainSfx === "function") {
        window.playPrayerBombRainSfx(0.75);
      }
      handlePrayerBombRainImpact();
      triggerPrayerBombExplosionAt(proj.x, proj.y, PRAYER_BOMB_RAIN_RADIUS, PRAYER_BOMB_LEVEL3_DAMAGE);
      maybeSpawnPrayerStormGroundFire(proj.x, proj.y);
    },
  });
  if (!proj) {
    if (typeof window !== "undefined" && typeof window.playPrayerBombRainSfx === "function") {
      window.playPrayerBombRainSfx(0.75);
    }
    handlePrayerBombRainImpact();
    triggerPrayerBombExplosionAt(target.x, target.y, PRAYER_BOMB_RAIN_RADIUS, PRAYER_BOMB_LEVEL3_DAMAGE);
    maybeSpawnPrayerStormGroundFire(target.x, target.y);
  }
}

function updatePrayerBombFireRain(dt) {
  if (prayerBombRainTimer <= 0) {
    if (prayerBombComboState.active) {
      endPrayerBombCombo();
    }
    return;
  }
  prayerBombRainTimer = Math.max(0, prayerBombRainTimer - dt);
  prayerBombRainSpawnTimer -= dt;
  while (prayerBombRainSpawnTimer <= 0 && prayerBombRainTimer > 0) {
    prayerBombRainSpawnTimer += PRAYER_BOMB_RAIN_INTERVAL;
    for (let burstIndex = 0; burstIndex < 2; burstIndex += 1) {
      const pos = randomSpreadPosition();
      spawnPrayerBombFireball(pos);
    }
  }
}

function updatePrayerStormGroundFires(dt) {
  if (!prayerStormGroundFires.length) return;
  const now = typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
  for (let i = prayerStormGroundFires.length - 1; i >= 0; i -= 1) {
    const fire = prayerStormGroundFires[i];
    fire.life = Math.max(0, (fire.life || 0) - dt);
    fire.frameTimer = (fire.frameTimer || 0) + dt;
    const frames = fire.frames || [];
    const frameDuration = Math.max(0.01, fire.frameDuration || PRAYER_STORM_GROUND_FIRE_FRAME_DURATION);
    if (frames.length) {
      while (fire.frameTimer >= frameDuration) {
        fire.frameTimer -= frameDuration;
        fire.frameIndex = ((fire.frameIndex || 0) + 1) % frames.length;
      }
    }
    const canTickEntity = (entity) => {
      if (!entity || entity.dead) return false;
      if (entity.state === "death") return false;
      const lastAt = fire.hitMap?.get(entity) || 0;
      return now - lastAt >= (fire.hitCooldown || PRAYER_STORM_GROUND_FIRE_HIT_COOLDOWN) * 1000;
    };
    const markTick = (entity) => {
      if (fire.hitMap) fire.hitMap.set(entity, now);
    };
    enemies.forEach((enemy) => {
      if (!canTickEntity(enemy)) return;
      const center = getEnemyHitboxCenter(enemy);
      const dist = Math.hypot(center.x - fire.x, center.y - fire.y);
      const targetRadius = getEnemyHitboxRadius(enemy);
      if (dist > (fire.radius || PRAYER_STORM_GROUND_FIRE_RADIUS) + targetRadius * 0.7) return;
      markTick(enemy);
      enemy.takeDamage(fire.damage || PRAYER_STORM_GROUND_FIRE_DAMAGE, { damageType: "charged" });
      spawnEnemyHitEffect(enemy, center.x, center.y, { damageType: "charged" });
    });
    if (activeBoss && !activeBoss.dead && !activeBoss.defeated && !activeBoss.removed && canTickEntity(activeBoss)) {
      const center = getEnemyHitboxCenter(activeBoss);
      const dist = Math.hypot(center.x - fire.x, center.y - fire.y);
      const targetRadius = activeBoss.radius || 0;
      if (dist <= (fire.radius || PRAYER_STORM_GROUND_FIRE_RADIUS) + targetRadius * 0.7) {
        markTick(activeBoss);
        activeBoss.takeDamage(fire.bossDamage || PRAYER_STORM_GROUND_FIRE_BOSS_DAMAGE, {
          hitX: center.x,
          hitY: center.y,
          damageType: "charged",
        });
        spawnEnemyHitEffect(activeBoss, center.x, center.y, { damageType: "charged" });
      }
    }
    projectiles.forEach((projectile) => {
      if (!projectile || projectile.dead || projectile.friendly || projectile.visualOnly) return;
      if (!canTickEntity(projectile)) return;
      const pr = Math.max(0, projectile.radius || 0);
      const dist = Math.hypot((projectile.x || 0) - fire.x, (projectile.y || 0) - fire.y);
      if (dist > (fire.radius || PRAYER_STORM_GROUND_FIRE_RADIUS) + pr * 0.8) return;
      markTick(projectile);
      const projectileDied = applyProjectileDurabilityDamage(
        projectile,
        fire.damage || PRAYER_STORM_GROUND_FIRE_DAMAGE,
      );
      if (projectileDied) {
        spawnImpactEffect(projectile.x, projectile.y);
        spawnFlashEffect(projectile.x, projectile.y);
      }
    });
    if (fire.life <= 0) {
      prayerStormGroundFires.splice(i, 1);
    }
  }
}

if (typeof window !== "undefined") {
  window.startPrayerBombFireRain = startPrayerBombFireRain;
  window.triggerPrayerBombScreenDarken = triggerPrayerBombScreenDarken;
  window.showPrayerBombBlastCombo = showPrayerBombBlastCombo;
}
let heroRescueCooldown = 0;

const START_COUNTDOWN_SEQUENCE = [];

let countdownState = null;
let needsCountdown = false;
// Allow world scale to be tuned centrally (set window.__BATTLECHURCH_WORLD_SCALE before init).
const DEFAULT_WORLD_SCALE = 0.75;
const projectileSettings =
  (typeof window !== "undefined" && window.BattlechurchProjectileConfig) || {};
const WORLD_SCALE =
  projectileSettings.worldScale ??
  ((typeof window !== "undefined" && window.__BATTLECHURCH_WORLD_SCALE !== undefined)
    ? Number(window.__BATTLECHURCH_WORLD_SCALE) || DEFAULT_WORLD_SCALE
    : DEFAULT_WORLD_SCALE);
const SPEED_SCALE = Math.max(0.01, WORLD_SCALE);
const createHaloBladeState = () => ({
  active: false,
  angle: 0,
  x: 0,
  y: 0,
  radius: 288 * WORLD_SCALE,
  speed: 5.6,
  damage: 20,
  hitRadius: 22 * WORLD_SCALE,
  hitCooldown: 0.25,
  lastHit: new WeakMap(),
  sprite: null,
  scale: 3.4 * WORLD_SCALE,
  trail: [],
  trailTimer: 0,
  trailSpacing: 10 * WORLD_SCALE,
  trailLife: 0.4,
  maxTrail: 18,
  tetherDamageMultiplier: 0.65,
  tetherHitRadius: 12 * WORLD_SCALE,
});
const haloBladeState = createHaloBladeState();
const haloBladeStateSecondary = createHaloBladeState();
const haloBladeStateBonus = createHaloBladeState();

const createSpearState = () => ({
  active: false,
  x: 0,
  y: 0,
  angle: 0,
  speed: 680 * WORLD_SCALE,
  damage: 20,
  hitRadius: 18 * WORLD_SCALE,
  hitCooldown: 0.15,
  lastHit: new WeakMap(),
  target: null,
  trail: [],
  trailTimer: 0,
  trailSpacing: 12 * WORLD_SCALE,
  trailLife: 0.6,
  maxTrail: 16,
  sprite: null,
  scale: 3.4 * WORLD_SCALE,
  minTravel: 200 * WORLD_SCALE,
  travelSinceHit: 0,
  pauseDuration: 0.15,
  pauseTimer: 0,
  pendingRetarget: false,
  hits: 0,
  lastTarget: null,
  lastHitPos: null,
  waypoint: null,
  startDelayTimer: 0,
  spawnOffset: { x: 0, y: 0 },
  useSpawnOffset: false,
  turnSfxCooldown: 0,
  trailOuterColor: "#FFD94A",
  trailInnerColor: "#FFF7A8",
  glowColor: "#FFE86B",
  pauseFlashColor: "#FFF0A0",
  trailOuterWidth: 5,
  trailInnerWidth: 2.2,
  glowBlur: 18,
  pauseFlashBlur: 28,
  searchSpinSpeed: 1.2,
});
const spearState = createSpearState();
const spearStateSecondary = createSpearState();
const spearStateBonus = createSpearState();
spearStateSecondary.trailOuterColor = "#B6E6FF";
spearStateSecondary.trailInnerColor = "#F2FCFF";
spearStateSecondary.glowColor = "#55CCFF";
spearStateSecondary.pauseFlashColor = "#7FE0FF";
spearStateSecondary.trailOuterWidth = 7;
spearStateSecondary.trailInnerWidth = 3.2;
spearStateSecondary.glowBlur = 28;
spearStateSecondary.pauseFlashBlur = 40;
spearStateBonus.trailOuterColor = "#FFD2A8";
spearStateBonus.trailInnerColor = "#FFF4D6";
spearStateBonus.glowColor = "#FFC86B";
spearStateBonus.pauseFlashColor = "#FFE2A6";
spearStateBonus.trailOuterWidth = 6;
spearStateBonus.trailInnerWidth = 2.6;
spearStateBonus.glowBlur = 30;
spearStateBonus.pauseFlashBlur = 42;

const createSentryState = () => ({
  active: false,
  x: 0,
  y: 0,
  baseX: 0,
  baseY: 0,
  offsetX: 0,
  offsetY: 0,
  floatTimer: 0,
  floatSpeed: 1.4,
  floatAmplitude: 6 * WORLD_SCALE,
  orbitEnabled: false,
  orbitAngleOffset: 0,
  orbitRadius: 26 * WORLD_SCALE,
  angle: 0,
  baseAngle: 0,
  sprite: null,
  scale: 3.2 * WORLD_SCALE,
  beamActive: false,
  beamProgress: 0,
  beamLength: 0,
  beamEndX: 0,
  beamEndY: 0,
  beamSpeed: 2800 * WORLD_SCALE,
  beamCooldown: 0.5,
  beamCooldownTimer: 0,
  boreSfxTimer: 0,
  beamStartDelay: 0,
  beamStartDelayTimer: 0,
  beamHitSfxTimer: 0,
  hitInterval: 0.05,
  hitTimer: 0,
  burnTimer: 0,
  burnInterval: 0,
  burnEffect: null,
  damage: 10,
  hitRadius: 18 * WORLD_SCALE,
  beamOuterWidth: 10 * WORLD_SCALE,
  beamInnerWidth: 4 * WORLD_SCALE,
  beamOuterColor: "rgba(255, 214, 140, 0.85)",
  beamInnerColor: "rgba(255, 250, 220, 0.95)",
  fadeAlpha: 1,
  target: null,
  lockedTarget: null,
});
const sentryState = createSentryState();
const sentryStateSecondary = createSentryState();
const sentryStateBonus = createSentryState();
sentryState.orbitEnabled = true;
sentryState.orbitAngleOffset = 0;
sentryStateSecondary.orbitEnabled = true;
sentryStateSecondary.orbitAngleOffset = Math.PI;
sentryStateBonus.orbitEnabled = true;
sentryStateBonus.orbitAngleOffset = (Math.PI * 2) / 3;
sentryStateSecondary.beamOuterColor = "rgba(182, 230, 255, 0.85)";
sentryStateSecondary.beamInnerColor = "rgba(242, 252, 255, 0.95)";
sentryStateSecondary.glowColor = "rgba(130, 210, 255, 0.75)";
sentryStateSecondary.glowBlur = 18;
sentryStateSecondary.beamStartDelay = 0.06;
sentryStateBonus.beamOuterColor = "rgba(255, 215, 155, 0.85)";
sentryStateBonus.beamInnerColor = "rgba(255, 247, 220, 0.95)";
sentryStateBonus.glowColor = "rgba(255, 200, 120, 0.72)";
sentryStateBonus.glowBlur = 18;
sentryStateBonus.beamStartDelay = 0.08;

// Melee Attack System Constants (tunable via GameBalance.melee.*)
const MELEE_SWING_LENGTH_BASE = 260;
// For hitbox calculations, we need a much smaller range to match the actual swoosh visual
const MELEE_SWING_RANGE = _gb('melee.swingRange', 104) * WORLD_SCALE;
const MELEE_CLOSE_RANGE = _gb('melee.closeRange', 60) * WORLD_SCALE;
const MELEE_OFFSET = 54 * WORLD_SCALE;
const MELEE_DAMAGE_KNOCKBACK = _gb('melee.knockback', 48) * WORLD_SCALE;
const MELEE_PUSHBACK_STRENGTH = _gb('melee.pushbackStrength', 36) * WORLD_SCALE;
const MELEE_DAMAGE_DURATION = _gb('melee.damageDuration', 0.25);
const GAME_MELEE_SWING_DURATION = _gb('melee.swingDuration', 0.2);
const MELEE_COOLDOWN = _gb('melee.cooldown', 0.4);
const MELEE_DOUBLE_TAP_WINDOW = _gb('melee.doubleTapWindow', 0.18);
const NORMAL_A_CHAIN_WINDOW_MS = Math.max(520, MELEE_COOLDOWN * 1000 + 140);
const NORMAL_A_REHIT_HURT_DURATION = 0.1;
const MELEE_HOLD_CHARGE_TIME = _gb('melee.holdChargeTime', 1.5);
const MELEE_BASE_DAMAGE = _gb('melee.baseDamage', 100);
const MELEE_SWOOSH_DAMAGE_SCALE = _gb('melee.swooshDamageScale', 1.2);
const MELEE_SWOOSH_EXIT_INVULNERABILITY = _gb('melee.swooshExitInvulnerability', 0.2);
const MELEE_SWOOSH_INVULNERABILITY = GAME_MELEE_SWING_DURATION + MELEE_SWOOSH_EXIT_INVULNERABILITY;
const MELEE_SWOOSH_ARC_SCALE = _gb('melee.swooshArcScale', 2.5);
const MELEE_PROJECTILE_COOLDOWN_AFTER = _gb('melee.projectileCooldownAfter', 0.5);
const MELEE_RUSH_LOCKOUT = _gb('melee.rushLockout', 1.0);
const MELEE_CHARGE_MOVE_MULTIPLIER = 0.6;
const MELEE_SPIN_DURATION = _gb('melee.spinDuration', 0.45);
const MELEE_SPIN_COOLDOWN = _gb('melee.spinCooldown', 2.0);
const MELEE_SPIN_DAMAGE_MULTIPLIER = _gb('melee.spinDamageMultiplier', 2);
const DOUBLE_STRIKE_DELAY = 0.13;
const COUNTER_HIT_WINDOW = 0.3;
const COUNTER_HIT_MULTIPLIER = 1.25;
const PUNISH_COUNTER_MULTIPLIER = 1.35;
const COUNTER_HIT_TEXT_LIFE = 2.9;
const PUNISH_COUNTER_TEXT_LIFE = 2.9;
const MELEE_COMBO_TEXT_LIFE = 2.9;
const COUNTER_HIT_GRACE_GEMS = 3;
const PUNISH_COUNTER_GRACE_GEMS = 6;
const MELEE_COMBO_GRACE_GEMS_BASE = 2;
const MELEE_COMBO_GRACE_GEMS_MAX = 4;
const MELEE_HITSTOP_DURATION = 0.09;
const MELEE_COMBO_HITSTOP_DURATION = 0.11;
const MELEE_COUNTER_HITSTOP_DURATION = MELEE_HITSTOP_DURATION;
const MELEE_PUNISH_HITSTOP_DURATION = MELEE_HITSTOP_DURATION;
const MELEE_HITSTOP_SHAKE = 10;
const MELEE_COMBO_HITSTOP_SHAKE = 13;
const MELEE_COUNTER_HITSTOP_SHAKE = 17;
const MELEE_PUNISH_HITSTOP_SHAKE = 22;
const RUSH_DISTANCE = _gb('rush.distance', 220) * WORLD_SCALE;
const RUSH_SPEED = _gb('rush.speed', 1200) * SPEED_SCALE;
const RUSH_DAMAGE = MELEE_BASE_DAMAGE * 2;
const RUSH_RADIUS = _gb('rush.radius', 50) * WORLD_SCALE;
const RUSH_PUSHBACK_RADIUS = _gb('rush.pushbackRadius', 52) * WORLD_SCALE;
const RUSH_PUSHBACK_STRENGTH = _gb('rush.pushbackStrength', 50) * WORLD_SCALE;
const RUSH_COOLDOWN = _gb('rush.cooldown', 3.0);
const RUSH_DUST_SPACING = 26 * WORLD_SCALE;
const RUSH_EXIT_INVULNERABILITY = _gb('rush.exitInvulnerability', 0.35);
const SPIN_HOLD_CHARGE_TIME = MELEE_HOLD_CHARGE_TIME;
const SPIN_CHARGE_MOVE_MULTIPLIER = 0.5;
const SPIN_MOVE_DISTANCE = RUSH_DISTANCE;
const SPIN_MOVE_SPEED = RUSH_SPEED;
const RING_OF_FIRE_RADIUS = 236 * WORLD_SCALE;
const RING_OF_FIRE_OUT_SPEED = 1550 * SPEED_SCALE;
const RING_OF_FIRE_RETURN_SPEED = 1550 * SPEED_SCALE;
const RING_OF_FIRE_TRACE_DURATION = 0.46;
const RING_OF_FIRE_LINGER_DURATION = 8.0;
const RING_OF_FIRE_BAND = 20 * WORLD_SCALE;
const RING_OF_FIRE_DAMAGE = 34;
const RING_OF_FIRE_BOSS_DAMAGE = 18;
const RING_OF_FIRE_HIT_COOLDOWN = 0.38;
const RING_OF_FIRE_INVULNERABILITY = 0.72;
const COMBO_WINDOW_MS = 350;
const DASH_DISTANCE = 200 * WORLD_SCALE;
const DASH_SPEED = 1400 * SPEED_SCALE;
const DASH_DUST_SPACING = 20 * WORLD_SCALE;
const DASH_COOLDOWN = 2.0;
const PROTECTED_DASH_DISTANCE = DASH_DISTANCE * 2;
const TELEPORT_INVULNERABILITY_DURATION = 1.0;
const DASH_COMBO_GRACE = 0.12;
const RUSH_HITBOX_DEBUG_DURATION = 0.12;
const BAT_SPAWN_COUNT = 10;
const BAT_SCATTER_DURATION = 0.35;
const BAT_SCATTER_SPEED_MULTIPLIER = 2.0;
const TORMENTOR_FLAME_MAX = 3;
const TORMENTOR_FLAME_RESPAWN_INTERVAL = 7.0;
const TORMENTOR_FLAME_ORBIT_SPEED = 2.6;
const TORMENTOR_FLAME_ORBIT_SCALE_MIN = 0.9;
const TORMENTOR_FLAME_ORBIT_SCALE_MAX = 1.08;
const TORMENTOR_FLAME_THROW_SPEED = 420;
const TORMENTOR_FLAME_THROW_DURATION = 0.48;
const TORMENTOR_FLAME_THROW_TOUCH_DELAY = 0.14;
const DIVINE_SHOT_DAMAGE = 100;
const DIVINE_SHOT_SPEED = 920 * SPEED_SCALE;
const DIVINE_SHOT_LIFE = 2.8;
const DIVINE_SHOT_AUTO_AIM_DURATION = 1.6;
const DIVINE_SHOT_AUTO_AIM_STRENGTH = 3.2;
const DIVINE_SHOT_AUTO_AIM_MIN_DOT = 0.25;
const DIVINE_SHOT_PROJECTILE_PRIORITY = 5;

const CANVAS_BASE_WIDTH = 1280;
const CANVAS_BASE_HEIGHT = 720;
const HUD_HEIGHT = 43;
const UI_FONT_FAMILY = "'Orbitron', sans-serif";

// Debug overlay toggle (DEV-ONLY)
const DEBUG = true;
let debugOverlayVisible = false;
let debugOverlayData = null;
let debugOverlayTimer = null;
let debugOverlayUpdateAccumulator = 0;
const DEBUG_OVERLAY_UPDATE_INTERVAL = 0.25; // Update 4 times per second

// Audio creation counter (DEV-ONLY) - tracks ALL Audio objects created
let audioCreatedTotal = 0;
if (DEBUG && typeof window !== "undefined" && typeof window.Audio !== "undefined") {
  const OriginalAudio = window.Audio;
  window.Audio = function(...args) {
    audioCreatedTotal++;
    return new OriginalAudio(...args);
  };
  // Preserve prototype chain
  window.Audio.prototype = OriginalAudio.prototype;
}

const BASE_ASPECT_RATIO = CANVAS_BASE_WIDTH / CANVAS_BASE_HEIGHT;
const TARGET_ASPECT_RATIO = (typeof window !== 'undefined' && window.__BATTLECHURCH_ASPECT_RATIO !== undefined)
  ? Number(window.__BATTLECHURCH_ASPECT_RATIO) || BASE_ASPECT_RATIO
  : BASE_ASPECT_RATIO;
const MOBILE_MAX_DIMENSION = 900;
const SLAB_ASPECT_MIN = 1.9;
const SQUARE_ASPECT_MAX = 1.4;
const ROTATE_ASPECT_MAX = 0.8;
const ROTATE_ROW_HEIGHT = 40;
const ASSET_CACHE_BUSTER = (typeof window !== 'undefined' && window.__BATTLECHURCH_ASSET_VERSION !== undefined)
  ? String(window.__BATTLECHURCH_ASSET_VERSION)
  : '2025-10-30a';
const MAGIC_SPLASH_RADIUS = projectileSettings.magicSplashRadius ?? 180 * WORLD_SCALE;
const MAGIC_SPLASH_DAMAGE_MULTIPLIER =
  projectileSettings.magicSplashDamageMultiplier ?? 1;
const FAITH_CANNON_SPLASH_RADIUS =
  projectileSettings.faithCannonSplashRadius ?? 120 * WORLD_SCALE;
const FAITH_CANNON_SPLASH_DAMAGE_MULTIPLIER =
  projectileSettings.faithCannonSplashDamageMultiplier ?? 1.0;
const FAITH_CANNON_PROJECTILE_RANGE =
  projectileSettings.faithCannonProjectileRange ?? 660 * WORLD_SCALE;
const FAITH_CANNON_PROJECTILE_COOLDOWN =
  projectileSettings.faithCannonCooldown ?? 0.22;
const SPAWN_CAMERA_SHAKE_DURATION =
  projectileSettings.spawnCameraShakeDuration ?? 0.24;
const SPAWN_CAMERA_SHAKE_MAGNITUDE =
  projectileSettings.spawnCameraShakeMagnitude ?? 10;
// Prayer Bomb constants (tunable via GameBalance.prayerBomb.*)
const PRAYER_BOMB_RADIUS = _gb('prayerBomb.radius', 520) * WORLD_SCALE;
const PRAYER_BOMB_DAMAGE_MULTIPLIER = _gb('prayerBomb.damageMultiplier', 12.0);
const PRAYER_BOMB_CHARGE_REQUIRED = _gb('prayerBomb.chargeRequired', 60);
const PRAYER_BOMB_LEVEL1_THRESHOLD = _gb('prayerBomb.level1Threshold', 2 / 6);
const PRAYER_BOMB_LEVEL2_THRESHOLD = _gb('prayerBomb.level2Threshold', 4 / 6);
const PRAYER_BOMB_LEVEL3_THRESHOLD = _gb('prayerBomb.level3Threshold', 1.0);
const PRAYER_BOMB_LEVEL1_DAMAGE = _gb('prayerBomb.level1Damage', 250);
const PRAYER_BOMB_LEVEL2_DAMAGE = _gb('prayerBomb.level2Damage', 400);
const PRAYER_BOMB_LEVEL3_DAMAGE = _gb('prayerBomb.level3Damage', 250);
const PRAYER_BOMB_LEVEL1_BOSS_DAMAGE = _gb('prayerBomb.level1BossDamage', 1000);
const PRAYER_BOMB_LEVEL2_BOSS_DAMAGE = _gb('prayerBomb.level2BossDamage', 2000);
const PRAYER_BOMB_LEVEL2_RADIUS = Math.max(0, Math.hypot(CANVAS_BASE_WIDTH, CANVAS_BASE_HEIGHT));
const PRAYER_BOMB_RAIN_DURATION = _gb('prayerBomb.rainDuration', 7);
const PRAYER_BOMB_RAIN_INTERVAL = _gb('prayerBomb.rainInterval', 0.12);
const PRAYER_BOMB_RAIN_RADIUS = _gb('prayerBomb.rainRadius', 160) * WORLD_SCALE;
const PRAYER_BOMB_BOSS_DAMAGE_SCALE = _gb('prayerBomb.bossDamageScale', 0.5);
const PRAYER_BOMB_SCREEN_DARKEN_ALPHA = _gb('prayerBomb.screenDarkenAlpha', 0.65);
const PRAYER_BOMB_RAIN_DARKEN_DURATION = _gb('prayerBomb.rainDarkenDuration', 0.5);
const PRAYER_BOMB_RAIN_SHAKE_DURATION = _gb('prayerBomb.rainShakeDuration', 0.12);
const PRAYER_BOMB_RAIN_SHAKE_MAGNITUDE = _gb('prayerBomb.rainShakeMagnitude', 10);
const PRAYER_STORM_GROUND_FIRE_TARGET_MIN = Math.max(
  1,
  Math.floor(_gb('prayerBomb.groundFireTargetMin', 16)),
);
const PRAYER_STORM_GROUND_FIRE_TARGET_MAX = Math.max(
  PRAYER_STORM_GROUND_FIRE_TARGET_MIN,
  Math.floor(_gb('prayerBomb.groundFireTargetMax', 20)),
);
const PRAYER_STORM_GROUND_FIRE_DAMAGE = _gb('prayerBomb.groundFireDamage', 10);
const PRAYER_STORM_GROUND_FIRE_BOSS_DAMAGE = _gb('prayerBomb.groundFireBossDamage', 10);
const PRAYER_STORM_GROUND_FIRE_HIT_COOLDOWN = _gb('prayerBomb.groundFireHitCooldown', 0.5);
const PRAYER_STORM_GROUND_FIRE_DURATION = _gb('prayerBomb.groundFireDuration', 14);
const PRAYER_STORM_GROUND_FIRE_FADE_DURATION = _gb('prayerBomb.groundFireFadeDuration', 1.2);
const PRAYER_STORM_GROUND_FIRE_RADIUS = _gb('prayerBomb.groundFireRadius', 42) * WORLD_SCALE;
const PRAYER_STORM_GROUND_FIRE_SCALE = _gb('prayerBomb.groundFireScale', 2.6) * WORLD_SCALE;
const PRAYER_STORM_GROUND_FIRE_FRAME_DURATION = _gb('prayerBomb.groundFireFrameDuration', 0.07);
const PRAYER_STORM_GROUND_FIRE_SHEETS = [
  "assets/sprites/items/fire/Group 4 - 1.png",
  "assets/sprites/items/fire/Group 4 - 2.png",
  "assets/sprites/items/fire/Group 4 - 3.png",
  "assets/sprites/items/fire/Group 4 - 4.png",
  "assets/sprites/items/fire/Group 4 - 5.png",
  "assets/sprites/items/fire/Group 5 - 1.png",
  "assets/sprites/items/fire/Group 5 - 2.png",
  "assets/sprites/items/fire/Group 5 - 3.png",
];
const CONGREGATION_COMMAND_CHARGE_TIME = _gb('congregationCommand.chargeTime', 7);
const CONGREGATION_COMMAND_DAMAGE = _gb('congregationCommand.damage', 30);
const CONGREGATION_COMMAND_SPEED_MULTIPLIER = _gb('congregationCommand.speedMultiplier', 1.1);
const CONGREGATION_COMMAND_SCALE = _gb('congregationCommand.scale', 1.15);
const CONGREGATION_COMMAND_STAGGER = _gb('congregationCommand.stagger', 0.14);
const CONGREGATION_COMMAND_SHAKE_DURATION = _gb('congregationCommand.shakeDuration', 0.12);
const CONGREGATION_COMMAND_SHAKE_MAGNITUDE = _gb('congregationCommand.shakeMagnitude', 8);
if (typeof window !== "undefined") {
  window.PRAYER_BOMB_RAIN_DURATION = PRAYER_BOMB_RAIN_DURATION;
}
const PRAYER_BOMB_CHARGE_PER_KILL = 0.5;
const PRAYER_BOMB_CHARGE_TYPE_MODIFIERS = {
  miniImp: 0.1,
  miniImpLevel2: 0.1,
};
const PRAYER_BOMB_HOLD_TIME = 1.0;
const HIT_FREEZE_DURATION = 0.08;
const CAMERA_SHAKE_DURATION = 0.3;
const CAMERA_SHAKE_INTENSITY = 18;
const WISDOM_HIT_SHAKE_DURATION = 0.15;
const WISDOM_HIT_SHAKE_MAGNITUDE = CAMERA_SHAKE_INTENSITY * 0.40;
const FAITH_HIT_SHAKE_DURATION = 0.15;
const FAITH_HIT_SHAKE_MAGNITUDE = CAMERA_SHAKE_INTENSITY * 0.25;
const DAMAGE_FLASH_DURATION = 0.6;
const DAMAGE_FLASH_INTENSITY = 1.35;
const SHIELD_SMALL_DAMAGE = 999;
const SHIELD_LARGE_DAMAGE = 220;
const SHIELD_LARGE_COOLDOWN = 0.25;
const SHIELD_LARGE_RADIUS_THRESHOLD = 42 * WORLD_SCALE;
const HERO_SPEECH_BUBBLE_PADDING = 10;
const HERO_BASE_HEARTS = 6;
const HERO_MAX_HEALTH = 100;
const HERO_HEALTH_PER_HEART = HERO_MAX_HEALTH / HERO_BASE_HEARTS;
const LOG_NPC_FAITH_BAR = false;
const PROJECTILE_CONFIG = projectileSettings.config || {};
const PROJECTILE_PATH =
  projectileSettings.projectilePath || "assets/sprites/projectiles/";
const MAGIC_PACK_ROOT =
  projectileSettings.magicPackRoot || "assets/sprites/projectiles";
const MAGIC_FIREBALL_SPRITE_PATH = `${MAGIC_PACK_ROOT}/fireball`;
const MAGIC_FLASH_SPRITE_PATH = `${MAGIC_PACK_ROOT}/flash`;
const POWERUP_PLAYFIELD_MARGIN = 140;
const CONRAD_UTILITY_POWERUP_MAX_HEIGHT = 48 * WORLD_SCALE;
function resizeCanvas() {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const viewportMin = Math.min(viewportWidth, viewportHeight);
  const viewportAspect = viewportWidth / Math.max(1, viewportHeight);
  const isMobile = viewportMin <= MOBILE_MAX_DIMENSION;
  const isRotateWarning = isMobile && viewportAspect < ROTATE_ASPECT_MAX;
  const layoutWidth = viewportWidth;
  const layoutHeight = viewportHeight;
  const layoutAspect = viewportAspect;
  const isSlabLayout = isMobile && layoutAspect >= SLAB_ASPECT_MIN;
  const isSquareLayout = isMobile && layoutAspect <= SQUARE_ASPECT_MAX;
  const scaleWidth = layoutWidth / CANVAS_BASE_WIDTH;
  const scaleHeight = layoutHeight / CANVAS_BASE_HEIGHT;
  const scale = isSquareLayout || isRotateWarning ? scaleWidth : Math.min(scaleWidth, scaleHeight);
  canvasScale = Math.max(0.1, scale);

  canvas.width = CANVAS_BASE_WIDTH;
  canvas.height = CANVAS_BASE_HEIGHT;
  const cssWidth = Math.round(CANVAS_BASE_WIDTH * canvasScale);
  const cssHeight = Math.round(CANVAS_BASE_HEIGHT * canvasScale);
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  if (gameWrapper) {
    gameWrapper.style.width = `${cssWidth}px`;
    gameWrapper.style.height = `${cssHeight}px`;
  }
  if (typeof document !== 'undefined' && document.documentElement) {
    const gameLeft = Math.floor((layoutWidth - cssWidth) / 2);
    const gameTop = (isSquareLayout || isRotateWarning) ? 0 : Math.floor((layoutHeight - cssHeight) / 2);
    const gutterWidth = Math.max(0, gameLeft);
    const gutterHeight = Math.max(0, Math.floor((layoutHeight - cssHeight) / 2));
    const rotateRowHeight = isRotateWarning ? ROTATE_ROW_HEIGHT : 0;
    const controlsHeight = Math.max(0, layoutHeight - cssHeight - rotateRowHeight);

    document.documentElement.style.setProperty('--viewport-width', `${viewportWidth}px`);
    document.documentElement.style.setProperty('--viewport-height', `${viewportHeight}px`);
    document.documentElement.style.setProperty('--layout-width', `${layoutWidth}px`);
    document.documentElement.style.setProperty('--layout-height', `${layoutHeight}px`);
    document.documentElement.style.setProperty('--game-width', `${cssWidth}px`);
    document.documentElement.style.setProperty('--game-height', `${cssHeight}px`);
    document.documentElement.style.setProperty('--game-left', `${gameLeft}px`);
    document.documentElement.style.setProperty('--game-top', `${gameTop}px`);
    document.documentElement.style.setProperty('--gutter-width', `${gutterWidth}px`);
    document.documentElement.style.setProperty('--gutter-height', `${gutterHeight}px`);
    document.documentElement.style.setProperty('--controls-height', `${controlsHeight}px`);
    document.documentElement.style.setProperty('--rotate-row-height', `${rotateRowHeight}px`);

    if (document.body) {
      document.body.classList.toggle('layout-mobile', isMobile);
      document.body.classList.toggle('layout-slab', isSlabLayout);
      document.body.classList.toggle('layout-square', isSquareLayout);
      document.body.classList.toggle('layout-rotate-warning', isRotateWarning);
    }
  }
  if (typeof window !== 'undefined') {
    window.__BATTLECHURCH_LAYOUT = {
      rotated: false,
      layoutWidth,
      layoutHeight,
      gameLeft: Math.floor((layoutWidth - cssWidth) / 2),
      gameTop: (isSquareLayout || isRotateWarning) ? 0 : Math.floor((layoutHeight - cssHeight) / 2),
      gameWidth: cssWidth,
      gameHeight: cssHeight,
    };
  }

  if (!pointerState.active) {
    pointerState.x = CANVAS_BASE_WIDTH / 2;
    pointerState.y = CANVAS_BASE_HEIGHT / 2;
  }

  if (typeof window !== "undefined" && window.AshOverlay) {
    if (!ashOverlay) {
      ashOverlay = new window.AshOverlay(canvas.width, canvas.height);
      fireOverlay = new window.AshOverlay(canvas.width, canvas.height, 300);
      fireOverlay.setEmbersOnly(true);
      fireOverlay.setEmberRatio(1);
      fireOverlay.setIntensity(1);
      window.fireOverlay = fireOverlay;
    } else {
      ashOverlay.resize(canvas.width, canvas.height);
      if (fireOverlay) {
        fireOverlay.resize(canvas.width, canvas.height);
      }
    }
  }

  positionObstacles();
  if (player) {
    resolveEntityObstacles(player);
    player.clampToBounds();
  }
  enemies.forEach((enemy) => {
    if (enemy?.spawnOffscreenTimer > 0) return;
    resolveEntityObstacles(enemy);
    clampEntityToBounds(enemy);
  });
  weaponPickups.forEach((pickup) => {
    resolveEntityObstacles(pickup);
    clampEntityToBounds(pickup);
  });
  Input.updateTouchLayout();
}

let gameStarted = false;
let pauseDialogActive = false;
let pauseRestartConfirmActive = false;
let mapActive = false;
let activeTownId = null;
let activeCampaign = "p1"; // 'p1' | 'p2' | 'p3'
let activeCampaignMultiplier = 1.0; // 1.0 | 1.15 | 1.1
let cloudInitAttempted = false;

function tryBootstrapCloud() {
  if (cloudInitAttempted) return;
  if (!window.Cloud?.initCloud) {
    setTimeout(tryBootstrapCloud, 250);
    return;
  }
  cloudInitAttempted = true;
  window.Cloud.initCloud().catch(() => {});
}

Input.initialize({
  canvas,
  touchControlsRoot,
  moveStickBase,
  aimStickBase,
  virtualSpaceButton,
  arcControl,
  onAnyKeyDown: (key) => {
    const modifiers = typeof Input !== "undefined" ? Input.modifiers : null;
    const devCombo = Boolean(modifiers && modifiers.shift);
    if (key === "m" && DEBUG && devCombo) {
      toggleDebugOverlay();
      return;
    }
    if (key === "g" && devCombo) {
      addGrace(500);
      setDevStatus("Dev: +500 grace");
    }
    if (key === "h" && titleScreenActive) {
      const editor = window.BattlechurchHitboxEditor;
      const next = typeof editor?.toggle === "function" ? editor.toggle() : false;
      if (next && window.DialogOverlay?.isVisible?.()) {
        window.DialogOverlay.hide();
      }
      return;
    }
    const hitboxEditorActive = Boolean(window.__battlechurchHitboxEditorActive);
    if (hitboxEditorActive) return;
    if (!gameStarted && !paused) gameStarted = true;
  },
  shouldUpdatePointer: () => Boolean(player),
});

const pointerState = Input.pointerState;
const aimState = Input.aimState;
const virtualInput = Input.virtualInput;
const keysJustPressed = Input.keysJustPressed;
const keysPressed = Input.keysPressed;
let announcementNavHoldDir = null;
let announcementNavNextTime = 0;
window.consumePauseAction = () => {
  keysJustPressed.delete("pause");
  keysJustPressed.delete("restart");
};
window.isMissionBriefOverlayActive = false;
window.isPauseOverlayActive = false;
window.shouldShowGameOverMessage = false;
window.gameOverReady = false;
window.gameOverDialogShown = false;
window.gameOverDialogActive = false;
window.gameOverReady = false;
window.postDeathSequenceActive = false;
if (typeof window !== "undefined") {
  window.BattlechurchHitboxDebug = window.BattlechurchHitboxDebug || {
    playerMelee: false,
    npcs: false,
    enemies: false,
    projectiles: false,
  };
  if (typeof window.BattlechurchShowAttackHitboxes !== "boolean") {
    window.BattlechurchShowAttackHitboxes = Boolean(window.BattlechurchHitboxDebug.enemies);
  }
}
const isActionActive = Input.isActionActive;
const wasActionJustPressed = Input.wasActionJustPressed;
const consumePrayerBombClick = Input.consumePrayerBombClick;
const consumeCongregationClick = Input.consumeCongregationClick;
const cancelCongregationTap = Input.cancelCongregationTap;
const aimAssist = {
  target: null,
  vertices: null,
  targetKind: null,
};
const SHOW_ENEMY_SPAWN_DEBUG = false;

function toggleHudHitboxDebug(key) {
  if (typeof window === "undefined" || !window.BattlechurchHitboxDebug) return false;
  if (!Object.prototype.hasOwnProperty.call(window.BattlechurchHitboxDebug, key)) return false;
  window.BattlechurchHitboxDebug[key] = !window.BattlechurchHitboxDebug[key];
  window.BattlechurchShowAttackHitboxes = Boolean(window.BattlechurchHitboxDebug.enemies);
  return true;
}
if (typeof window !== "undefined") {
  window.BattlechurchToggleHitboxDebug = toggleHudHitboxDebug;
}

Renderer.initialize({
  get canvas() { return canvas; },
  get ctx() { return ctx; },
  levelAnnouncements,
  weaponPickupAnnouncement,
  HUD_HEIGHT,
  UI_FONT_FAMILY,
  bossHazards,
  SHOW_ENEMY_SPAWN_DEBUG,
  getEnemySpawnPoints,
  congregationMembers,
  buildCongregationMembers,
  clearCongregationMembers,
  updateCongregationMembers,
  getMonthName,
  getOffscreenNpcInviteName,
  get assets() { return assets; },
  get cameraOffsetX() { return cameraOffsetX; },
  get cameraShakeTimer() { return cameraShakeTimer; },
  CAMERA_SHAKE_DURATION,
  get cameraShakeMagnitude() { return cameraShakeMagnitude; },
  get titleScreenActive() { return titleScreenActive; },
  get titleDemoSaveMenuActive() { return titleDemoSaveMenuActive; },
  get titleDemoSaveSlots() { return TITLE_DEMO_SAVE_SLOTS; },
  get titleCloudSaveLoading() { return titleCloudSaveLoading; },
  get titleCloudSaveRows() { return titleCloudSaveRows; },
  get titleCloudActiveSaveId() { return titleCloudActiveSaveId; },
  get titleCloudSelectedSaveId() { return titleCloudSelectedSaveId; },
  get mapActive() { return mapActive; },
  get assetsLoaded() { return assetsLoaded; },
  get mapReady() { return mapReady; },
  get loadingProgress() { return loadingProgress; },
  get levelManager() { return levelManager; },
  get pendingBossIntroAfterExterior() { return pendingBossIntroAfterExterior; },
  get gameOver() { return gameOver; },
  obstacles,
  npcs,
  utilityPowerUps,
  weaponPickups,
  churchPowerupPickups,
  gracePickups,
  enemies,
  get activeBoss() { return activeBoss; },
  projectiles,
  get visitorSession() { return visitorSession; },
  get player() { return player; },
  getCongregationSize,
  initialCongregationSize: INITIAL_CONGREGATION_SIZE,
  get cannonSplashRadius() { return FAITH_CANNON_SPLASH_RADIUS; },
  effects,
  ringOfFireHazards,
  prayerStormGroundFires,
  floatingTexts,
  pointerState,
  get paused() { return paused; },
  getStartCountdownLabel,
  aimState,
  aimAssist,
  get graceRushState() { return graceRushState; },
  getGraceCount: () => getGraceCount(),
  WORLD_SCALE,
  get MELEE_SWING_RANGE() { return MELEE_SWING_RANGE; },
  get MELEE_CLOSE_RANGE() { return MELEE_CLOSE_RANGE; },
  get DASH_COOLDOWN() { return DASH_COOLDOWN; },
  get playerDashState() { return playerDashState; },
  get damageHitFlash() { return damageHitFlash; },
  get npcWeaponState() { return npcWeaponState; },
  get npcHarmonyBuffTimer() { return npcHarmonyBuffTimer; },
  get npcHarmonyBuffDuration() { return npcHarmonyBuffDuration; },
  get powerupIconStyles() { return POWERUP_ICON_STYLES; },
  get graceHudFlyEffects() { return graceHudFlyEffects; },
  get powerupHudFlyEffects() { return powerupHudFlyEffects; },
  get maxComboThisTown() { return maxComboThisTown; },
  get haloBladeState() { return haloBladeState; },
  get haloBladeStateSecondary() { return haloBladeStateSecondary; },
  get haloBladeStateBonus() { return haloBladeStateBonus; },
  get spearState() { return spearState; },
  get spearStateSecondary() { return spearStateSecondary; },
  get spearStateBonus() { return spearStateBonus; },
  get sentryState() { return sentryState; },
  get sentryStateSecondary() { return sentryStateSecondary; },
  get sentryStateBonus() { return sentryStateBonus; },
  formatNumberWithCommas,
  updatePlayerDuringCongregation,
  resolveCongregationCollisions,
  get touchControlsVisible() { return Boolean(Input?.virtualInput?.enabled); },
  get touchControlsAvailable() { return Boolean(touchControlsRoot); },
  get bossLightningFlashAlpha() { return bossLightningFlashAlpha; },
  get postDeathSequenceActive() { return postDeathSequenceActive; },
  get heroLives() { return heroLives; },
  get hpFlashTimer() { return hpFlashTimer; },
  get gameStarted() { return gameStarted; },
  get epilogueActive() { return epilogueActive; },
  get epilogueTitle() { return epilogueTitle; },
  get epilogueText() { return epilogueText; },
  get epilogueBackgroundKey() { return epilogueBackgroundKey; },
  get epilogueScroll() { return epilogueScroll; },
  get creditsContent() { return CREDITS_CONTENT; },
  get townVictoryActive() { return townVictoryActive; },
  get townVictoryTownName() { return townVictoryTownName; },
  get townVictoryScore() { return townVictoryScore; },
  get townVictoryScroll() { return townVictoryScroll; },
  get ashOverlay() { return ashOverlay; },
  get fireOverlay() { return fireOverlay; },
  get congregationOverlay() { return congregationOverlay; },
  get speedrunTimer() { return speedrunTimer; },
  get pauseRestartConfirmActive() { return pauseRestartConfirmActive; },
  get isModalActive() { return isAnyDialogActive(); },
  get arenaFadeAlpha() { return arenaFadeAlpha; },
  get actBreakFadeAlpha() { return actBreakFadeAlpha; },
  get chapterBreakActive() { return chapterBreakActive; },
  get chapterBreakActNumber() { return chapterBreakActNumber; },
  get chapterBreakImage() { return chapterBreakImage; },
  get graceRushFadeAlpha() { return graceRushFadeAlpha; },
  get graceRushBlackout() { return graceRushBlackout; },
  get bossBonusTransitionFadeAlpha() { return bossBonusTransitionFadeAlpha; },
  get recapIntroFadeAlpha() { return recapIntroFadeAlpha; },
  get playerDeathFadeAlpha() { return playerDeathFadeAlpha; },
  get prayerBombScreenFadeTimer() { return prayerBombScreenFadeTimer; },
  get prayerBombScreenFadeDuration() { return prayerBombScreenFadeDuration; },
  get prayerBombScreenDarkenAlpha() { return PRAYER_BOMB_SCREEN_DARKEN_ALPHA; },
  get RUSH_RADIUS() { return RUSH_RADIUS; },
  get meleeAttackState() { return window._meleeAttackState; },
  get devTools() { return devTools; },
  getEnemyHitboxRect,
  get townIntroTransitionActive() { return townIntroTransitionActive; },
  get townIntroTransitionTimer() { return townIntroTransitionTimer; },
  TOWN_INTRO_ZOOM_DURATION,
  TOWN_INTRO_FADE_DURATION,
  renderDebugOverlay,
});
function bootInputAndResize() {
  resizeCanvas();
  Input.updateTouchLayout();
}

if (document.readyState === "complete" || document.readyState === "interactive") {
  setTimeout(bootInputAndResize, 0);
  setTimeout(tryBootstrapCloud, 0);
} else {
  window.addEventListener("load", bootInputAndResize);
  window.addEventListener("load", tryBootstrapCloud);
}

window.addEventListener("resize", () => {
  resizeCanvas();
  Input.updateTouchLayout();
}, { passive: true });

if (typeof window !== "undefined") {
  window.startRunForTown = startRunForTown;
  window.exitMapScreen = exitMapScreen;
  // Expose loading state for MapScreen to check
  Object.defineProperty(window, "gameAssetsLoaded", {
    get: () => assetsLoaded,
    enumerable: true,
  });
  Object.defineProperty(window, "gameLoadingProgress", {
    get: () => loadingProgress,
    enumerable: true,
  });
}

const PLAYER_SPRITE_PATH = "assets/sprites/pastor/characters/";
const BACKGROUND_MID_PATH = "assets/backgrounds/mid-bg.png";
const BACKGROUND_FLOOR_PATH = "assets/backgrounds/background-6.png";
const TITLE_BACKGROUND_PATH = "assets/backgrounds/title.jpg";
const TOWN_INTRO_BACKGROUND_PATH = "assets/backgrounds/game-over.jpg";
const CHARACTER_ROOT = "assets/sprites/rpg-sprites/Characters(100x100)";
const OBSTACLE_DEFS = {};
const OBSTACLE_LAYOUT = [];
const DIVINE_CHARGE_SPARK_ROOT = "assets/sprites/projectiles/sparks";
const DIVINE_CHARGE_SPARK_COUNT = 16;
const DIVINE_CHARGE_SPARK_FRAME_DURATION = 0.06;
const DIVINE_CHARGE_SPARK_SCALE = 1.5;
const DIVINE_CHARGE_SPARK_OFFSET = 18;
const MELEE_SWOOSH_PATH = "assets/sprites/pastor/actions/swoosh.png";
const WISDOM_FRAME_START = 9;
const WISDOM_FRAME_END = 18;
const WISDOM_FRAME_SOURCES = Array.from(
  { length: WISDOM_FRAME_END - WISDOM_FRAME_START + 1 },
  (_, index) => `${MAGIC_FIREBALL_SPRITE_PATH}/fireball${WISDOM_FRAME_START + index}.png`,
); // Wisdom projectile uses frames 9-18 from the fireball sprite sheet.
const DEMON_LORD_FIREBALL_FRAME_FILES = Array.from(
  { length: 10 },
  (_, index) => `${MAGIC_FIREBALL_SPRITE_PATH}/fireball${9 + index}.png`,
);
const WORD_OF_GOD_FRAME_FILES = Array.from(
  { length: 11 },
  (_, index) => `assets/sprites/projectiles/fire4/1_${index}.png`,
);
const FLASH_FRAME_COUNT = 14;
const PROJECTILE_FRAME_DURATIONS = {
  fire: 0.05,
  fireOrb: 0.05,
  wisdom_missle: 0.05,
  faith_cannon: 0.06,
  word_of_god: 0.06,
};
const ARMORED_PROJECTILE_DEFLECT_DISTANCE = 75 * WORLD_SCALE;
const ARMORED_PROJECTILE_DEFLECT_SPEED_SCALE = 0.45;
const ARMORED_PROJECTILE_DEFLECT_ANGLE = Math.PI * 0.22;
const ARMORED_PROJECTILE_DEFLECT_ANGLE_VARIANCE = Math.PI * 0.08;
const ARMORED_PROJECTILE_DEFLECT_TYPES = new Set(["arrow"]);
const NPC_COZY_ROOT = "assets/sprites/npcs";
const NPC_WALK_ROOT = `${NPC_COZY_ROOT}/separate/walk`;
const NPC_SHADOW_PATH = `${NPC_COZY_ROOT}/shadow.png`;
const NPC_FRAME_WIDTH = 32;
const NPC_FRAME_HEIGHT = 32;
const NPC_FRAMES_PER_DIRECTION = 8;
const NPC_DIRECTION_ROW_MAP = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
};
const NPC_WALK_FRAME_DURATION = 0.1;
const NPC_SCALE = 2.8 * WORLD_SCALE;
const NPC_RADIUS = 28 * WORLD_SCALE;
const NPC_BASE_VARIANT = "char1_walk.png";
const NPC_EYE_LAYER = "eyes_walk.png";
const NPC_SHOES_LAYER = "shoes_walk.png";
const npcVariants =
  (typeof window !== "undefined" && window.BattlechurchNpcVariants) || {};
const NPC_HAIR_VARIANTS = npcVariants.hair || [];
const NPC_CLOTHING_VARIANTS = npcVariants.clothing || [];
const NPC_ACCESSORY_VARIANTS = npcVariants.accessories || [];
const NPC_COZY_WALK_FRAME_COUNT = NPC_FRAMES_PER_DIRECTION;
const NPC_COZY_HURT_ROOT = `${NPC_COZY_ROOT}/separate/hurt`;
const NPC_BASE_HURT_VARIANT = "char1_hurt.png";
const NPC_HURT_FRAME_DURATION = 0.18;
const NPC_MAX_FAITH = 100;
const NPC_FAITH_DRAIN_RATE = 14;
const NPC_FAITH_RECOVERY_PER_COIN = 22;
const NPC_FAITH_RETURN_THRESHOLD = NPC_MAX_FAITH * 0.96;
// NPC helper tuning
const NPC_STARTING_FAITH_RATIO = 1; // start NPCs at 100% faith
const NPC_FAITH_PER_ENEMY_KILL = 0; // default faith gained per enemy kill
const NPC_FAITH_KILL_REWARD_EXCLUSIONS = new Set(); // enemy kills that should not reward NPC faith
const NPC_ARROW_COOLDOWN_DEFAULT = 0.8; // faster default seconds between NPC shots
const NPC_ARROW_RANGE_DEFAULT = 520; // maximum range NPC will attempt to shoot
const NPC_ARROW_DAMAGE = 10; // damage dealt by NPC arrows
const NPC_MAX_FAITH_LOSS_PER_ATTACK = 25;
// make faith bars slightly smaller and closer to the NPC for better layout
const NPC_FAITH_BAR_WIDTH = 40;
const NPC_FAITH_BAR_HEIGHT = 8;
const NPC_FAITH_FILL_COLOR = "#5AA6D6";
function resolveSwatchColor(propertyName, fallback) {
  if (typeof window === "undefined" || typeof document === "undefined") return fallback;
  try {
    const value = window.getComputedStyle(document.documentElement).getPropertyValue(propertyName);
    return value ? value.trim() : fallback;
  } catch (error) {
    console.warn && console.warn("resolveSwatchColor failed", propertyName, error);
    return fallback;
  }
}
const GRACE_FLOAT_TEXT_COLOR = resolveSwatchColor("--swatch-accent-2", "#9BD9FF");
const NPC_FAITH_BORDER_COLOR = resolveSwatchColor("--swatch-light", "rgba(255, 255, 255, 0.25)");
const NPC_HURT_VARIANT_REMAP = {
  overalls: "overall",
  mask_clown_red: "mask_clown",
};
const NPC_HURT_FILENAME_OVERRIDES = {
  "overalls_walk.png": "overall_hurt.png",
  "mask_clown_red_walk.png": "mask_clown_hurt.png",
};
const NPC_DAMAGE_COOLDOWN = 1.5;
const NPC_DAMAGE_COOLDOWN_EXCEPTIONS = ["ghost"];

const npcDialogue =
  (typeof window !== "undefined" && window.BattlechurchNpcDialogue) || {};
const NPC_STRUGGLE_LINES = npcDialogue.struggleLines || [];
const NPC_RETURN_LINES = npcDialogue.returnLines || [];

const CONGREGATION_OVERLAY_PHASE_1_DURATION = 0.6;
const CONGREGATION_OVERLAY_PHASE_2_DURATION = 0.6;
const CONGREGATION_OVERLAY_PHASE_3_DURATION = 0.8;
const CONGREGATION_OVERLAY_HOLD_DURATION = 1.0;
const CONGREGATION_OVERLAY_TOTAL_DURATION =
  CONGREGATION_OVERLAY_PHASE_1_DURATION +
  CONGREGATION_OVERLAY_PHASE_2_DURATION +
  CONGREGATION_OVERLAY_PHASE_3_DURATION +
  CONGREGATION_OVERLAY_HOLD_DURATION;
const congregationOverlay = {
  active: false,
  timer: 0,
  phase: 0,
  countTo: 0,
  countValue: 0,
  lastPhase: -1,
  playedFinal: false,
};

function playCongregationOverlayWordSfx() {
  playPooledSfx(
    congregationOverlaySfxPool,
    CONGREGATION_OVERLAY_WORD_SFX_SRC,
    CONGREGATION_OVERLAY_SFX_POOL_SIZE,
    { volume: 0.6 },
  );
}

function playCongregationOverlayFinalSfx() {
  playPooledSfx(
    congregationOverlaySfxPool,
    CONGREGATION_OVERLAY_FINAL_SFX_SRC,
    CONGREGATION_OVERLAY_SFX_POOL_SIZE,
    { volume: 0.7 },
  );
}

function playCongregationFightSfx(volume = 0.65) {
  playPooledSfx(
    congregationFightSfxPool,
    CONGREGATION_FIGHT_SFX_SRC,
    CONGREGATION_FIGHT_SFX_POOL_SIZE,
    { volume },
  );
}

function playCongregationCountPopSfx(volume = 0.6, direction = "up") {
  const isDown = direction === "down";
  playPooledSfx(
    isDown ? congregationCountPopDownSfxPool : congregationCountPopUpSfxPool,
    isDown ? CONGREGATION_COUNT_POP_DOWN_SFX_SRC : CONGREGATION_COUNT_POP_UP_SFX_SRC,
    CONGREGATION_COUNT_POP_SFX_POOL_SIZE,
    { volume, matchSrc: true },
  );
}

if (typeof window !== "undefined") {
  window.playCongregationCountPopSfx = playCongregationCountPopSfx;
}
function triggerCongregationOverlay(targetCount) {
  const count = Number.isFinite(targetCount) ? Math.max(0, Math.round(targetCount)) : 0;
  congregationOverlay.active = true;
  congregationOverlay.timer = 0;
  congregationOverlay.phase = 0;
  congregationOverlay.countTo = count;
  congregationOverlay.countValue = 0;
  congregationOverlay.lastPhase = -1;
  congregationOverlay.playedFinal = false;
}

function updateCongregationOverlay(dt) {
  if (!congregationOverlay.active) return;
  congregationOverlay.timer += dt;
  const t = congregationOverlay.timer;
  const phase1End = CONGREGATION_OVERLAY_PHASE_1_DURATION;
  const phase2End = phase1End + CONGREGATION_OVERLAY_PHASE_2_DURATION;
  const phase3End = phase2End + CONGREGATION_OVERLAY_PHASE_3_DURATION;
  const holdEnd = phase3End + CONGREGATION_OVERLAY_HOLD_DURATION;
  let phase = 0;
  if (t >= phase2End) phase = 2;
  else if (t >= phase1End) phase = 1;
  if (phase !== congregationOverlay.lastPhase) {
    if (phase === 0 || phase === 1) {
      playCongregationOverlayWordSfx();
    }
    congregationOverlay.lastPhase = phase;
  }
  congregationOverlay.phase = phase;
  if (phase === 2) {
    const progress = Math.min(1, Math.max(0, (t - phase2End) / CONGREGATION_OVERLAY_PHASE_3_DURATION));
    const value = Math.min(
      congregationOverlay.countTo,
      Math.max(0, Math.floor(congregationOverlay.countTo * progress)),
    );
    congregationOverlay.countValue = value;
    if (!congregationOverlay.playedFinal && progress >= 1) {
      congregationOverlay.playedFinal = true;
      playCongregationOverlayFinalSfx();
    }
    if (progress >= 1) {
      congregationOverlay.countValue = congregationOverlay.countTo;
    }
  } else {
    congregationOverlay.countValue = 0;
  }
  if (t >= holdEnd) {
    congregationOverlay.active = false;
  }
}

function getMissionIndexFromName(name) {
  if (!name) return null;
  // Parse "Mission X" format to get mission number
  const match = String(name).match(/Mission\s*(\d+)/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

// Alias for backwards compatibility
function getMonthIndexFromName(name) {
  return getMissionIndexFromName(name);
}

function isNoCooldownDamageSource(type) {
  if (!type) return false;
  const normalized = String(type).toLowerCase();
  return NPC_DAMAGE_COOLDOWN_EXCEPTIONS.some((token) => normalized.includes(token));
}

// Mission names replace calendar month names in the new terminology
// Each Battle has multiple Missions (default 3)
const MISSIONS_PER_BATTLE = (typeof window !== "undefined" && window.MONTHS_PER_LEVEL) || 3;

function getMissionName(globalMissionNumber) {
  if (!Number.isFinite(globalMissionNumber) || globalMissionNumber <= 0) return "Mission 1";
  // Calculate which mission within the current battle (1-indexed)
  const missionInBattle = ((globalMissionNumber - 1) % MISSIONS_PER_BATTLE) + 1;
  return `Mission ${missionInBattle}`;
}

// Alias for backwards compatibility
function getMonthName(levelNumber) {
  return getMissionName(levelNumber);
}

function getUpcomingMissionName() {
  const status = levelManager?.getStatus ? levelManager.getStatus() : null;
  const currentMission = status?.month;
  if (!currentMission) return "";
  // Parse "Mission X" format to get next mission
  const match = String(currentMission).match(/Mission\s*(\d+)/i);
  if (match) {
    const currentNum = parseInt(match[1], 10);
    const nextNum = (currentNum % MISSIONS_PER_BATTLE) + 1;
    return `Mission ${nextNum}`;
  }
  return String(currentMission);
}

// Alias for backwards compatibility
function getUpcomingMonthName() {
  return getUpcomingMissionName();
}

const COIN_FRAME_FILES = [
  "I57_Coin.png",
  "I57_Coin.png",
  "I57_Coin.png",
  "I57_Coin.png",
];
const COIN_HEAL_AMOUNT = NPC_FAITH_RECOVERY_PER_COIN;
// Enemy catalog: grouped by archetype so it’s easy to see ranges vs bruisers vs NPC-focus.
// The Entities module later applies the health-based slow-down on every entry.

const ENEMY_CATALOG =
  (typeof window !== "undefined" && window.BattlechurchEnemyCatalog?.catalog) || {};
const DEV_LEVEL_BUILDER =
  (typeof window !== "undefined" && window.BattlechurchLevelBuilder) || null;
const DEV_ENEMY_EDITOR =
  (typeof window !== "undefined" && window.BattlechurchEnemyEditor) || null;

function applyDevEnemyOverrides(baseDefs) {
  return { ...(baseDefs || {}) };
}

const ENEMY_DEFINITIONS_RAW =
  applyDevEnemyOverrides(ENEMY_CATALOG);

// MiniFolk enemies: catalog entries with a spriteSrc field (single sprite sheet loaders).
const MINIFOLKS = Object.entries(ENEMY_CATALOG)
  .filter(([, def]) => def.spriteSrc)
  .map(([key, def]) => ({ key, src: def.spriteSrc }));
const MINIFOLK_KEYS = new Set(MINIFOLKS.map((entry) => entry.key));
const EXTRA_ENEMY_KEYS = new Set([
  "armoredOrc",
  "armoredSkeleton",
  "armoredAxeman",
  "armoredEliteOrc",
  "orc",
]);
const ENEMY_DEFINITIONS = Object.fromEntries(
  Object.entries(ENEMY_DEFINITIONS_RAW).filter(
    ([key]) => MINIFOLK_KEYS.has(key) || EXTRA_ENEMY_KEYS.has(key),
  ),
);

const powerupDefinitions =
  (typeof window !== "undefined" && window.BattlechurchPowerupDefinitions) ||
  {};
const WEAPON_DROP_DEFS = powerupDefinitions.weaponDropDefs || {};
const UTILITY_POWERUP_DEFS = powerupDefinitions.utilityPowerupDefs || {};
const CHURCH_POWERUP_DEFS = powerupDefinitions.churchPowerupDefs || {};

function applyExplicitEnemyFrameMaps(enemyName, clipBundle) {
  if (!clipBundle) return;
  if (enemyName === "miniDemonFireThrower") {
    const idleMap = [0, 1, 2, 3];
    const walkMap = [8, 9, 10, 11, 12, 13];
    if (clipBundle.idle) clipBundle.idle.frameMap = idleMap.slice();
    if (clipBundle.walk) clipBundle.walk.frameMap = walkMap.slice();
    return;
  }
  if (enemyName === "miniDemonLord" || enemyName === "bossDemonLord") {
    const attackMap = Array.from({ length: 9 }, (_, index) => 51 + index);
    const jumpMap = [20, 60, 60, 60, 21, 22, 23];
    if (clipBundle.attack) {
      clipBundle.attack.frameMap = attackMap.slice();
      clipBundle.attack.frameCount = attackMap.length;
      if (!clipBundle.attack.frameRate || clipBundle.attack.frameRate <= 0) {
        clipBundle.attack.frameRate = 10;
      }
    }
    if (clipBundle.jump) {
      clipBundle.jump.frameMap = jumpMap.slice();
      clipBundle.jump.frameCount = jumpMap.length;
      clipBundle.jump.frameRate = 12;
    }
  }
}

const ASSET_MANIFEST =
  window.BattlechurchAssetManifest?.build?.({
    playerSpritePath: PLAYER_SPRITE_PATH,
    projectilePath: PROJECTILE_PATH,
    magicPackRoot: MAGIC_PACK_ROOT,
    characterRoot: CHARACTER_ROOT,
    enemyDefinitions: ENEMY_DEFINITIONS,
  }) || {};
if (typeof window !== "undefined") {
  window.ASSET_MANIFEST = ASSET_MANIFEST;
  window.__BATTLECHURCH_CHARACTER_ROOT = CHARACTER_ROOT;
}
// Inject mini folks into the enemies manifest so they are loaded like other enemies.
// Each mini sprite sheet will be used as a single animation named 'idle' - the
// loader will infer frame dimensions; game logic will reuse 'walk' and 'attack'
// by playing the same clip where needed so the characters animate.
for (const mini of MINIFOLKS) {
  const miniDef = ENEMY_DEFINITIONS[mini.key] || ENEMY_CATALOG[mini.key] || {};
  const assetGrid = miniDef.assetGrid || null;
  const animationFrameMaps = miniDef.animationFrameMaps || {};
  const isBat = mini.key === "bat";
  const isTormentorFlame = mini.key === "tormentorFlame";
  const frameWidth = isBat ? 34 : isTormentorFlame ? 32 : 0;
  const frameHeight = isBat ? 34 : isTormentorFlame ? 48 : 0;
  const fallbackFrameMap =
    isBat ? [0, 1, 2, 3] :
    isTormentorFlame ? Array.from({ length: 14 }, (_, i) => i) :
    undefined;
  const getFrameMap = (state) => {
    const mapped = animationFrameMaps[state];
    return Array.isArray(mapped) && mapped.length ? mapped.slice() : fallbackFrameMap;
  };
  ASSET_MANIFEST.enemies[mini.key] = {
    idle: {
      src: mini.src,
      frameWidth,
      frameHeight,
      gridCols: assetGrid?.cols || undefined,
      gridRows: assetGrid?.rows || undefined,
      frameRate: 8,
      loop: true,
      frameMap: getFrameMap("idle"),
    },
    walk: {
      src: mini.src,
      frameWidth,
      frameHeight,
      gridCols: assetGrid?.cols || undefined,
      gridRows: assetGrid?.rows || undefined,
      frameRate: 10,
      loop: true,
      frameMap: getFrameMap("walk"),
    },
    attack: {
      src: mini.src,
      frameWidth,
      frameHeight,
      gridCols: assetGrid?.cols || undefined,
      gridRows: assetGrid?.rows || undefined,
      frameRate: 12,
      loop: false,
      frameMap: getFrameMap("attack"),
    },
    jump: {
      src: mini.src,
      frameWidth,
      frameHeight,
      gridCols: assetGrid?.cols || undefined,
      gridRows: assetGrid?.rows || undefined,
      frameRate: 12,
      loop: false,
      frameMap: getFrameMap("jump"),
    },
    hurt: {
      src: mini.src,
      frameWidth,
      frameHeight,
      gridCols: assetGrid?.cols || undefined,
      gridRows: assetGrid?.rows || undefined,
      frameRate: 10,
      loop: false,
      frameMap: getFrameMap("hurt"),
    },
    death: {
      src: mini.src,
      frameWidth,
      frameHeight,
      gridCols: assetGrid?.cols || undefined,
      gridRows: assetGrid?.rows || undefined,
      frameRate: 10,
      loop: false,
      frameMap: getFrameMap("death"),
    },
  };
}

const { AnimationClip, Animator } = window.Entities || {};
const PLAYER_BASE_SCALE = 1.08;
const PLAYER_SCALE = PLAYER_BASE_SCALE * WORLD_SCALE;
const PLAYER_COLLISION_RADIUS = 12;
const PLAYER_HITBOX_STORAGE_KEY = "battlechurch.playerHitbox";

function loadBundledPlayerHitbox(fallback) {
  const bundled = window.BattlechurchHitboxes?.player?.hitbox || null;
  if (!bundled || typeof bundled !== "object") return null;
  return normalizeStoredPlayerHitbox(bundled, fallback);
}

function normalizeStoredPlayerHitbox(hitbox, fallback) {
  if (!hitbox || typeof hitbox !== "object") return { ...fallback };
  const width = Number(hitbox.width);
  const height = Number(hitbox.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return { ...fallback };
  return {
    width,
    height,
    offsetX: Number.isFinite(Number(hitbox.offsetX)) ? Number(hitbox.offsetX) : fallback.offsetX,
    offsetY: Number.isFinite(Number(hitbox.offsetY)) ? Number(hitbox.offsetY) : fallback.offsetY,
  };
}

function loadStoredPlayerHitbox(fallback) {
  const bundled = loadBundledPlayerHitbox(fallback);
  if (bundled) return bundled;
  if (typeof localStorage === "undefined") return { ...fallback };
  try {
    const raw = localStorage.getItem(PLAYER_HITBOX_STORAGE_KEY);
    if (!raw) return { ...fallback };
    return normalizeStoredPlayerHitbox(JSON.parse(raw), fallback);
  } catch (error) {
    console.warn("Failed to load stored player hitbox", error);
    return { ...fallback };
  }
}

function saveStoredPlayerHitbox(hitbox) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PLAYER_HITBOX_STORAGE_KEY, JSON.stringify(hitbox));
  } catch (error) {
    console.warn("Failed to save player hitbox", error);
  }
}

const DEFAULT_PLAYER_BODY_HITBOX = {
  width: PLAYER_COLLISION_RADIUS * PLAYER_SCALE * 2.7,
  height: PLAYER_COLLISION_RADIUS * PLAYER_SCALE * 3.4,
  offsetX: 0,
  offsetY: PLAYER_COLLISION_RADIUS * PLAYER_SCALE * 0.45,
};
const DEFAULT_PLAYER_WEAPON_HITBOX = {
  width: PLAYER_COLLISION_RADIUS * PLAYER_SCALE * 7.2,
  height: PLAYER_COLLISION_RADIUS * PLAYER_SCALE * 5.2,
  offsetX: PLAYER_COLLISION_RADIUS * PLAYER_SCALE * 4.8,
  offsetY: 0,
};
const DEFAULT_PLAYER_DASH_SLASH_HITBOX = {
  width: PLAYER_COLLISION_RADIUS * PLAYER_SCALE * 8.6,
  height: PLAYER_COLLISION_RADIUS * PLAYER_SCALE * 5.8,
  offsetX: PLAYER_COLLISION_RADIUS * PLAYER_SCALE * 4.9,
  offsetY: 0,
};
const DEFAULT_PLAYER_RUSH_HITBOX = {
  width: 260 * WORLD_SCALE * 1.68,
  height: 260 * WORLD_SCALE * 0.92,
  offsetX: 260 * WORLD_SCALE * 0.34,
  offsetY: 0,
};
const DEFAULT_PLAYER_ATTACK_HIT_FRAME = 2;
const PLAYER_BODY_HITBOX = loadStoredPlayerHitbox(DEFAULT_PLAYER_BODY_HITBOX);
const PLAYER_WEAPON_HITBOX = normalizeStoredPlayerHitbox(
  window.BattlechurchHitboxes?.player?.weaponHitbox || null,
  DEFAULT_PLAYER_WEAPON_HITBOX,
);
const PLAYER_DASH_SLASH_HITBOX = normalizeStoredPlayerHitbox(
  window.BattlechurchHitboxes?.player?.dashSlashHitbox || null,
  DEFAULT_PLAYER_DASH_SLASH_HITBOX,
);
const PLAYER_RUSH_HITBOX = normalizeStoredPlayerHitbox(
  window.BattlechurchHitboxes?.player?.rushHitbox || null,
  DEFAULT_PLAYER_RUSH_HITBOX,
);
const PLAYER_ATTACK_HIT_FRAME = Number.isFinite(Number(window.BattlechurchHitboxes?.player?.attackHitFrame))
  ? Math.max(1, Math.round(Number(window.BattlechurchHitboxes.player.attackHitFrame)))
  : DEFAULT_PLAYER_ATTACK_HIT_FRAME;
const PLAYER_BODY_RADIUS_FALLBACK = Math.max(PLAYER_BODY_HITBOX.width, PLAYER_BODY_HITBOX.height) * 0.5;
const PLAYER_FRAME_SIZE = 100;

// small horizontal camera offset (world scroll) used to drive parallax
let cameraOffsetX = 0;
const CAMERA_SCROLL_LIMIT = 56; // reduced: subtle parallax only

const BASE_PLAYER_CONFIG = {
  scale: PLAYER_SCALE,
  speed: 299 * SPEED_SCALE,
  arrowCooldown: 0.35 / 2,
  maxHealth: HERO_MAX_HEALTH,
  radius: PLAYER_BODY_RADIUS_FALLBACK,
  hitbox: { ...PLAYER_BODY_HITBOX },
  weaponHitbox: { ...PLAYER_WEAPON_HITBOX },
  dashSlashHitbox: { ...PLAYER_DASH_SLASH_HITBOX },
  rushHitbox: { ...PLAYER_RUSH_HITBOX },
  attackHitFrame: PLAYER_ATTACK_HIT_FRAME,
};

const ENTITIES_BOOTSTRAP = window.Entities?.initialize?.({
  WORLD_SCALE,
  PLAYER_BASE_SCALE,
  HERO_MAX_HEALTH,
  PRAYER_BOMB_CHARGE_REQUIRED,
  CONGREGATION_COMMAND_CHARGE_TIME,
  DAMAGE_FLASH_INTENSITY,
  PLAYER_BASE_CONFIG: BASE_PLAYER_CONFIG,
  ENEMY_DEFINITIONS,
});

const PLAYER_CONFIG = ENTITIES_BOOTSTRAP?.PLAYER_CONFIG || BASE_PLAYER_CONFIG;
const ENEMY_TYPES =
  ENTITIES_BOOTSTRAP?.ENEMY_TYPES || buildEnemyTypesFallback(ENEMY_DEFINITIONS);

function applyHitboxChange(key, sourceHitbox, sourceWeaponHitbox) {
  if (!key || !ENEMY_CATALOG || !ENEMY_CATALOG[key]) return;
  const def = ENEMY_CATALOG[key];
  if (sourceHitbox && typeof sourceHitbox === "object") {
    def.hitbox = { ...sourceHitbox };
  }
  if (sourceWeaponHitbox && typeof sourceWeaponHitbox === "object") {
    def.weaponHitbox = { ...sourceWeaponHitbox };
  } else if (sourceWeaponHitbox === null) {
    delete def.weaponHitbox;
  }
  const scale = (def.scale || 1) * WORLD_SCALE;
  const scaled = buildScaledHitbox(def, scale);
  const scaledWeaponHitbox = (() => {
    const raw = def.weaponHitbox || null;
    if (!raw) return null;
    const width = Number(raw.width);
    const height = Number(raw.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return null;
    }
    const offsetX = Number.isFinite(raw.offsetX) ? raw.offsetX : 0;
    const offsetY = Number.isFinite(raw.offsetY) ? raw.offsetY : 0;
    return {
      width: width * scale,
      height: height * scale,
      offsetX: offsetX * scale,
      offsetY: offsetY * scale,
    };
  })();
  const scaledRadius = getHitboxRadius(scaled, (def.baseRadius || 14) * scale);
  if (ENEMY_TYPES && ENEMY_TYPES[key]) {
    ENEMY_TYPES[key].hitbox = scaled;
    ENEMY_TYPES[key].hitRadius = scaledRadius;
    ENEMY_TYPES[key].weaponHitbox = scaledWeaponHitbox || undefined;
    ENEMY_TYPES[key].attackHitFrame =
      Number.isFinite(def.attackHitFrame) && def.attackHitFrame > 0 ? def.attackHitFrame : undefined;
    ENEMY_TYPES[key].attackHitDamage =
      Number.isFinite(def.attackHitDamage) && def.attackHitDamage >= 0
        ? def.attackHitDamage
        : undefined;
    ENEMY_TYPES[key].contactDamage =
      Number.isFinite(def.contactDamage) && def.contactDamage >= 0
        ? def.contactDamage
        : undefined;
    ENEMY_TYPES[key].attackDamage =
      Number.isFinite(def.attackDamage) && def.attackDamage >= 0
        ? def.attackDamage
        : undefined;
    ENEMY_TYPES[key].damage =
      Number.isFinite(def.damage) && def.damage >= 0 ? def.damage : ENEMY_TYPES[key].damage;
  }
  if (Array.isArray(enemies)) {
    enemies.forEach((enemy) => {
      if (enemy && enemy.type === key) {
        enemy.config.hitbox = scaled;
        enemy.config.hitRadius = scaledRadius;
        enemy.config.weaponHitbox = scaledWeaponHitbox || undefined;
        enemy.config.attackHitFrame =
          Number.isFinite(def.attackHitFrame) && def.attackHitFrame > 0
            ? def.attackHitFrame
            : undefined;
        enemy.config.attackHitDamage =
          Number.isFinite(def.attackHitDamage) && def.attackHitDamage >= 0
            ? def.attackHitDamage
            : undefined;
        enemy.config.contactDamage =
          Number.isFinite(def.contactDamage) && def.contactDamage >= 0
            ? def.contactDamage
            : undefined;
        enemy.config.attackDamage =
          Number.isFinite(def.attackDamage) && def.attackDamage >= 0
            ? def.attackDamage
            : undefined;
        if (Number.isFinite(def.damage) && def.damage >= 0) {
          enemy.config.damage = def.damage;
        }
        enemy.radius = scaledRadius;
        enemy.safeTopMargin = Math.max(enemy.radius * 3.5, 100);
      }
    });
  }
}

if (typeof window !== "undefined") {
  window.__battlechurchApplyHitboxChange = applyHitboxChange;
}

// Developer/testing: restrict automatic MiniFolk spawns on level 1 to a single

  Spawner.initialize({
    enemies,
    npcs,
    getAssets: () => assets,
    enemyTypes: ENEMY_TYPES,
    createEnemyInstance,
    randomSpawnPosition,
    spawnPuffEffect,
    randomChoice,
    randomInRange,
    applyCameraShake,
    spawnCameraShakeDuration: SPAWN_CAMERA_SHAKE_DURATION,
    spawnCameraShakeMagnitude: SPAWN_CAMERA_SHAKE_MAGNITUDE,
    playEnemySpawnSfx: typeof playEnemySpawnSfx === "function" ? playEnemySpawnSfx : null,
    getLevelManager: () => levelManager,
    miniFolks: MINIFOLKS,
    maxActiveEnemies: MAX_ACTIVE_ENEMIES,
    skeletonMinCount: SKELETON_MIN_COUNT,
    skeletonPackSize: SKELETON_PACK_SIZE,
    miniImpBaseGroupSize: MINI_IMP_BASE_GROUP_SIZE,
    miniImpMaxGroupSize: MINI_IMP_MAX_GROUP_SIZE,
    miniImpMinGroupsPerHorde: MINI_IMP_MIN_GROUPS_PER_HORDE,
    enemySpawnStaggerMs: ENEMY_GROUP_SPAWN_STAGGER_MS,
    worldScale: WORLD_SCALE,
  });

const spawnEnemyOfType = Spawner.spawnEnemyOfType;
const spawnSkeletonGroup = Spawner.spawnSkeletonGroup;
const spawnMiniImpGroup = Spawner.spawnMiniImpGroup;
const schedulePortalSpawn = Spawner.schedulePortalSpawn;
const spawnEnemy = Spawner.spawnEnemy;
const maintainSkeletonHorde = Spawner.maintainSkeletonHorde;
const maintainMiniImpHorde = Spawner.maintainMiniImpHorde;
const getPendingPortalSpawnCount = Spawner.getPendingPortalSpawnCount;

function startPostBossVisitorSession(config = {}) {
  return beginVisitorSession({
    duration: VISITOR_SESSION_DURATION,
    autoTriggered: true,
    onComplete: config?.onComplete,
    level: config?.level || 0,
  });
}

Levels.initialize({
  enemies,
  npcs,
  randomChoice,
  randomInRange,
  queueLevelAnnouncement,
  setDevStatus,
  getMonthName,
  spawnEnemyOfType,
  spawnMiniImpGroup,
  schedulePortalSpawn,
  randomSpawnPosition,
  spawnPowerUpDrops,
  spawnBossForLevel,
  devClearOpponents,
  resetCozyNpcs,
  buildCongregationMembers,
  clearCongregationMembers,
  clearPowerUps: clearAllPowerUps,
  clearGrace: clearGracePickups,
  spawnVictoryGraceBurst,
  startBattleGraceRush,
  getLastEnemyDeathPosition,
  spawnWeaponPickups: spawnWeaponDrops,
  evacuateNpcsForBoss,
  restoreNpcsAfterBoss,
  heroSay,
  npcCheer,
  onNpcLost: handleNpcLostFromCongregation,
  prepareNpcProcession,
  isNpcProcessionComplete: areNpcProcessionsComplete,
  getConversationResponders: getCongregationConversationResponders,
  startActBreakFade,
  startGraceRushEndFade,
  triggerCongregationOverlay,
  getCongregationSize,
  showWaveHealthSnapshot,
  showBattleVictoryNpcDialogue,
  playBattleVictoryMusic: startBattleVictoryMusic,
  startBossBonusTransition,
  playWaveTransitionSfx,
  rotateNpcPositionsForActBreak,
  getAvailableMiniFolkKeys: () => MINIFOLKS.map((m) => m.key),
  hasEnemyAsset: (key) => Boolean(ASSET_MANIFEST.enemies?.[key]),
  miniImpBaseGroupSize: MINI_IMP_BASE_GROUP_SIZE,
  miniImpMaxGroupSize: MINI_IMP_MAX_GROUP_SIZE,
  miniImpMinGroupsPerHorde: MINI_IMP_MIN_GROUPS_PER_HORDE,
  enemySpawnStaggerMs: ENEMY_GROUP_SPAWN_STAGGER_MS,
  isPostBattleFlowBlocked: () =>
    Boolean(
      levelAnnouncements.length ||
      window.DialogOverlay?.isVisible?.() ||
      window.UpgradeScreen?.isVisible?.(),
    ),
  startVisitorMinigame: startPostBossVisitorSession,
  getPendingPortalSpawnCount,
});

const AIM_ASSIST_LENGTH = 520;
const AIM_ASSIST_FOV = Math.PI / 4;
const ARROW_DAMAGE = 10;
const ENEMY_SPAWN_MARGIN = 140;
const ENEMY_SPAWN_JITTER = 26;
const ENEMY_SPAWN_DEBUG_BOX_SIZE = 80;
const ENEMY_SPAWN_PUFF_DURATION = 0;
const WEAPON_POWERUP_EFFECTS = new Set([
  "wisdomWeapon",
  "scriptureWeapon",
  "cannonWeapon",
  "npcScriptureWeapon",
  "npcWisdomWeapon",
  "npcFaithWeapon",
]);
const CHURCH_POWERUP_EFFECTS = new Set([
  "spreadGun",
  "halo",
  "spear",
  "sentry",
]);
let devPowerupSwapIndex = 0;
const weaponPowerupConfig = projectileSettings.weaponPowerups || {};
// NPC buff presets and state. The legacy keys still drive anchor/layout behavior.
const FORMATION_PRESETS = {
  circle: {
    key: "circle",
    label: "Guided Study",
    spokenLabel: "Guided Study",
    bonuses: { damage: 0.2, armorPierce: true, projectileType: "lichBolt" },
  },
  line: { key: "line", label: "Bible Study", spokenLabel: "Bible Study", bonuses: { rof: 0.2 } },
  crescent: { key: "crescent", label: "Shared Burdens", spokenLabel: "Care Group", bonuses: { prayerChargeGain: 0.1 } },
};
const npcWeaponState = {
  mode: null,
  timer: 0,
  duration: 0,
  damageMultiplier: 1,
  cooldownMultiplier: 1,
  speedMultiplier: 1,
};
const formationState = {
  current: null,
  bonuses: {
    rof: 0,
    damage: 0,
    powerupDuration: 0,
    prayerChargeGain: 0,
    armorPierce: false,
    projectileType: null,
  },
  anchors: [],
  jitterRadius: 28,
  swappedThisBattle: new Set(),
  swapCooldown: 0,
  combatSpreadScale: 1.18,
  combatSpreadScaleCurrent: 1.18,
  homePressure: 0,
};

function resolveWeaponPowerupConfig(effect, def = {}) {
  const defaults = weaponPowerupConfig[effect] || {};
  const overrides = def || {};
  return {
    duration: overrides.duration ?? def.duration ?? defaults.duration ?? 8,
    maxShots: overrides.maxShots ?? def.maxShots ?? defaults.maxShots ?? 2,
    cooldownMultiplier:
      overrides.cooldownMultiplier ?? def.cooldownMultiplier ?? defaults.cooldownMultiplier ?? 1,
    speedMultiplier:
      overrides.speedMultiplier ?? def.speedMultiplier ?? defaults.speedMultiplier ?? 1,
    damageMultiplier:
      overrides.damageMultiplier ?? def.damageMultiplier ?? defaults.damageMultiplier ?? 1,
    text: overrides.text ?? defaults.text ?? effect,
    textColor: overrides.textColor ?? defaults.textColor ?? "#fff",
    statusBgColor: overrides.statusBgColor ?? defaults.statusBgColor,
    statusLife: overrides.statusLife ?? defaults.statusLife,
    hudTitle: overrides.hudTitle ?? defaults.hudTitle ?? overrides.text ?? defaults.text ?? effect,
    description: overrides.description ?? defaults.description ?? "",
    hudDuration: overrides.hudDuration ?? defaults.hudDuration ?? 2.6,
    spokenName: overrides.spokenName ?? defaults.spokenName ?? null,
  };
}

function setWeaponPickupAnnouncement({ title, description, color, duration } = {}) {
  if (!title && !description) return;
  weaponPickupAnnouncement.title = title || "";
  weaponPickupAnnouncement.description = description || "";
  weaponPickupAnnouncement.color = color || "#EAF6FF";
  weaponPickupAnnouncement.duration = Number.isFinite(duration) ? duration : 2.6;
  weaponPickupAnnouncement.timer = weaponPickupAnnouncement.duration;
}

function showWeaponPowerupConfigText(config) {
  showWeaponPowerupFloatingText(config.text, config.textColor || "#fff");
  const announcementTitle = config.hudTitle || config.text || "Weapon Power Up";
  setWeaponPickupAnnouncement({
    title: announcementTitle,
    description: config.description || "",
    color: config.textColor || "#fff",
    duration: config.hudDuration,
  });
  playerYell(config.spokenName || announcementTitle, 3.2);
}

function getWeaponPowerName(effect, fallback = "Weapon") {
  switch (effect) {
    case "wisdomWeapon":
      return "Wisdom";
    case "scriptureWeapon":
      return "Scripture";
    case "cannonWeapon":
      return "Faith";
    default:
      return fallback || "Weapon";
  }
}

function roundEnemyDamageToFive(value) {
  const raw = Number.isFinite(value) && value > 0 ? value : 1;
  return Math.max(5, Math.ceil(raw / 5) * 5);
}

function buildScaledHitbox(def, scale) {
  const raw = def && def.hitbox ? def.hitbox : null;
  if (!raw) return null;
  const width = Number(raw.width);
  const height = Number(raw.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  const offsetX = Number.isFinite(raw.offsetX) ? raw.offsetX : 0;
  const offsetY = Number.isFinite(raw.offsetY) ? raw.offsetY : 0;
  return {
    width: width * scale,
    height: height * scale,
    offsetX: offsetX * scale,
    offsetY: offsetY * scale,
  };
}

function getHitboxRadius(hitbox, fallback = 0) {
  if (!hitbox || !Number.isFinite(hitbox.width) || !Number.isFinite(hitbox.height)) return fallback;
  return Math.max(hitbox.width, hitbox.height) * 0.5;
}

function buildEnemyTypesFallback(defs) {
  if (!defs || typeof defs !== "object") return {};
  return Object.fromEntries(
    Object.entries(defs).map(([key, def]) => {
      const scale = def.scale * WORLD_SCALE;
      const baseRadius = def.baseRadius || 14;
      const hitbox = buildScaledHitbox(def, scale);
      const baseHitRadius = baseRadius * scale;
      const hitRadius = getHitboxRadius(hitbox, baseHitRadius);
      const attackRange = def.attackRange ?? hitRadius + (def.attackBonus ?? 30);
      const displayName = def.displayName || def.folder || key;
      return [
        key,
        {
          speed: def.speed,
          health: def.health,
          maxHealth: def.health,
          damage: roundEnemyDamageToFive(def.damage),
          contactDamage:
            Number.isFinite(def.contactDamage) && def.contactDamage >= 0
              ? roundEnemyDamageToFive(def.contactDamage)
              : undefined,
          attackDamage:
            Number.isFinite(def.attackDamage) && def.attackDamage >= 0
              ? roundEnemyDamageToFive(def.attackDamage)
              : undefined,
          attackRange,
          hitRadius,
          attackCooldown: def.cooldown,
          scale,
          displayName,
          ranged: Boolean(def.ranged),
          projectileType: def.projectileType || null,
          preferEdges: Boolean(def.preferEdges),
          desiredRange: def.desiredRange || attackRange,
          projectileCooldown: def.projectileCooldown || def.cooldown,
          damageClass: def.damageClass,
          hitbox,
        },
      ];
    }),
  );
}

const HEALTH_BAR_ROW_HITS = [3, 6, 12, 24, 48];
const HEALTH_BAR_COLORS = ["#ff4d4d", "#ff9f43", "#FFC86A", "#a8ff82", "#9BD9FF"];

class Obstacle {
  constructor(asset, xRatio, yRatio) {
    this.image = asset.image;
    this.scale = asset.scale;
    this.baseCollisionRadius = asset.collisionRadius;
    this.collisionRadius = this.baseCollisionRadius * this.scale;
    this.xRatio = xRatio;
    this.yRatio = yRatio;
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    this.updatePosition();
  }

  updatePosition() {
    this.x = this.xRatio * canvas.width;
    this.y = this.yRatio * canvas.height;
    this.width = this.image.width * this.scale;
    this.height = this.image.height * this.scale;
    this.collisionRadius = this.baseCollisionRadius * this.scale;
  }

  draw(context) {
    context.save();
    context.translate(this.x, this.y);
    context.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);
    context.restore();
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const originalSrc = src;
    const cached = assetSrcResolutionCache.get(originalSrc) || null;
    const image = new Image();
    let fallbackIndex = 0;
    const fallbackCandidates = [];

    const computeLowercaseFilenameFallback = (input) => {
      try {
        const parts = input.split("/");
        const filename = parts.pop() || "";
        const lower = filename.toLowerCase();
        if (lower && lower !== filename) {
          parts.push(lower);
          return parts.join("/");
        }
      } catch (e) {
        // ignore
      }
      return null;
    };

    const computeLowercasePathFallback = (input) => {
      try {
        const parts = input.split("/").map((part) => part.toLowerCase());
        return parts.join("/");
      } catch (e) {
        return null;
      }
    };

    const computeLowercaseDirsFallback = (input) => {
      try {
        const parts = input.split("/");
        if (parts.length <= 1) return null;
        const filename = parts.pop() || "";
        const lowered = parts.map((part) => part.toLowerCase());
        lowered.push(filename);
        return lowered.join("/");
      } catch (e) {
        return null;
      }
    };

    if (!cached) {
      const lowerFile = computeLowercaseFilenameFallback(originalSrc);
      if (lowerFile && lowerFile !== originalSrc) {
        fallbackCandidates.push(withAssetVersion(lowerFile));
      }
      const lowerDirs = computeLowercaseDirsFallback(originalSrc);
      if (lowerDirs && lowerDirs !== originalSrc) {
        fallbackCandidates.push(withAssetVersion(lowerDirs));
      }
      const lowerPath = computeLowercasePathFallback(originalSrc);
      if (lowerPath && lowerPath !== originalSrc) {
        fallbackCandidates.push(withAssetVersion(lowerPath));
      }
    }

    image.onload = () => {
      if (!cached) {
        assetSrcResolutionCache.set(originalSrc, image.src);
      }
      resolve(image);
    };

    image.onerror = () => {
      if (!cached && fallbackIndex < fallbackCandidates.length) {
        const next = fallbackCandidates[fallbackIndex];
        fallbackIndex += 1;
        if (next && next !== image.src) {
          image.src = next;
          return;
        }
      }
      reject(new Error(`Failed to load image: ${image.src}`));
    };

    const resolved = cached || withAssetVersion(originalSrc);
    image.src = resolved;
  });
}

function loadCachedImage(cache, src) {
  if (!cache.has(src)) {
    cache.set(src, loadImage(src));
  }
  return cache.get(src);
}

function withAssetVersion(path) {
  if (!path || !ASSET_CACHE_BUSTER) return path;
  if (path.includes(`v=${ASSET_CACHE_BUSTER}`)) return path;
  return path.includes("?")
    ? `${path}&v=${ASSET_CACHE_BUSTER}`
    : `${path}?v=${ASSET_CACHE_BUSTER}`;
}

// Runtime image cache for dev reloads
const devImageCache = new Map();

async function reloadEnemyClipsForKey(key) {
  try {
    if (!ASSET_MANIFEST.enemies[key]) {
      console.warn('reloadEnemyClipsForKey: no manifest entry for', key);
      return Promise.resolve();
    }
    const enemyDefs = ASSET_MANIFEST.enemies[key];
    const newClips = {};
    const loaders = Object.entries(enemyDefs).map(async ([state, def]) => {
      try {
        const clip = await loadAnimationClip(def, devImageCache);
        newClips[state] = clip;
      } catch (e) {
        console.warn('reloadEnemyClipsForKey: failed loading state', { key, state, def, e });
      }
    });
    await Promise.all(loaders);
    applyExplicitEnemyFrameMaps(key, newClips);
    assets.enemies = assets.enemies || {};
    assets.enemies[key] = newClips;
    return Promise.resolve();
  } catch (e) {
    console.warn('reloadEnemyClipsForKey: unexpected error', e);
    return Promise.reject(e);
  }
}

async function reloadProjectileClipForKey(key) {
  try {
    const def = ASSET_MANIFEST.projectiles[key];
    if (!def) {
      console.warn('reloadProjectileClipForKey: no manifest entry for', key);
      return Promise.resolve();
    }
    const clip = await loadAnimationClip(def, devImageCache);
    assets.projectiles = assets.projectiles || {};
    assets.projectiles[key] = clip;
    return Promise.resolve();
  } catch (e) {
    console.warn('reloadProjectileClipForKey: unexpected error', e);
    return Promise.reject(e);
  }
}

// Generate conservative default frameMaps for MiniFolk sprite sheets when no
// developer overrides are present. This prevents the runtime from cycling the
// entire sheet for every state (idle/walk/etc.) when the inspector data was
// lost. The function returns an object mapping state -> array<frameIndex>.
function generateDefaultFrameMapsForMini(key, clips) {
  try {
    if (!MINIFOLKS.some((m) => m.key === key)) return null;
    // Prefer idle clip to read frameCount, fallback to any clip
    const sample = clips.idle || Object.values(clips)[0];
    if (!sample) return null;
    // If frameCount isn't useful, attempt to infer grid from the image
    let total = sample.frameCount;
    if (!Number.isFinite(total) || total <= 1) {
      try {
        const img = sample.image;
        if (img && img.width > 0 && img.height > 0 && sample.frameWidth && sample.frameHeight) {
          const cols = Math.max(1, Math.floor(img.width / sample.frameWidth));
          const rows = Math.max(1, Math.floor(img.height / sample.frameHeight));
          total = cols * rows;
        } else if (img && img.width > 0 && img.height > 0) {
          // Try common divisors for likely grids
          const commonCols = [4, 3, 2, 6, 8];
          const commonRows = [2, 3, 4];
          let found = false;
          for (const c of commonCols) {
            if (img.width % c !== 0) continue;
            for (const r of commonRows) {
              if (img.height % r !== 0) continue;
              const fw = img.width / c;
              const fh = img.height / r;
              if (fw >= 8 && fh >= 8 && fw <= 512 && fh <= 512) {
                total = c * r;
                found = true;
                break;
              }
            }
            if (found) break;
          }
          if (!found) {
            // gcd fallback: assume square-ish tiles
            const g = (function gcd(a,b){a=Math.abs(a)|0;b=Math.abs(b)|0;while(b){const t=b;b=a%b;a=t;}return a||1;})(img.width, img.height);
            if (g > 1 && img.width % g === 0 && img.height % g === 0) {
              const cols = Math.floor(img.width / g);
              const rows = Math.floor(img.height / g);
              total = Math.max(1, cols * rows);
            }
          }
        }
      } catch (e) {
        // ignore and bail below if still invalid
      }
    }
    if (!Number.isFinite(total) || total <= 1) return null;
    const states = ['idle', 'walk', 'attack', 'hurt', 'death'];
    // Weights bias more frames to walk (movement) and fewer to hurt/death
    const weights = { idle: 1, walk: 2, attack: 1, hurt: 1, death: 1 };
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    // Compute counts, ensure at least 1 where possible
    const counts = {};
    let remaining = total;
    for (const st of states) {
      const w = weights[st] || 1;
      let c = Math.max(1, Math.floor((total * w) / totalWeight));
      // don't allocate more than remaining
      c = Math.min(c, remaining - (states.length - Object.keys(counts).length - 1));
      counts[st] = c;
      remaining -= c;
    }
    // If any leftover frames, give to 'walk'
    if (remaining > 0) {
      counts.walk = (counts.walk || 1) + remaining;
      remaining = 0;
    }

  // Build contiguous ranges in order from 0..total-1
    const maps = {};
    let index = 0;
    for (const st of states) {
      const c = counts[st] || 0;
      const arr = [];
      for (let i = 0; i < c && index < total; i += 1) {
        arr.push(index);
        index += 1;
      }
      if (arr.length) maps[st] = arr;
    }
    // If death is missing frames, ensure it has at least the final frame
    if (!maps.death || !maps.death.length) maps.death = [Math.max(0, total - 1)];
  // default frame maps generated for mini (silenced)
    return maps;
  } catch (e) {
    return null;
  }
}

async function loadAnimationClip(definition, cache) {
  if (!cache.has(definition.src)) {
    cache.set(definition.src, loadImage(definition.src));
  }
  const image = await cache.get(definition.src);

  // If the definition provides explicit frame dimensions, use them.
  let frameWidth = definition.frameWidth || 0;
  let frameHeight = definition.frameHeight || 0;

  // Helper: greatest common divisor for inferring grid cell size
  function gcd(a, b) {
    a = Math.abs(a) | 0;
    b = Math.abs(b) | 0;
    while (b) {
      const t = b;
      b = a % b;
      a = t;
    }
    return a || 1;
  }

  if (!frameWidth || !frameHeight) {
    const w = image.width;
    const h = image.height;

  const srcBase = (definition.src || "").split('/').pop() || "";
  const normalizedSrc = String(srcBase).trim().toLowerCase();
  const staticManualOverrides = {
  'MiniFireImp.png': { cols: 2, rows: 2 },
      'MiniHighDemon.png': { cols: 2, rows: 2 },
      'MiniDemonLord.png': { cols: 10, rows: 8 },
      'MiniDemonFireKeeper.png': { cols: 1, rows: 1 },
      'MiniSkeleton.png': { cols: 1, rows: 1 },
      'MiniZombie.png': { cols: 1, rows: 1 },
      'MiniZombieButcher.png': { cols: 4, rows: 4 },
  'minifireball.png': { cols: 4, rows: 2 },
  'minilichspell.png': { cols: 4, rows: 4 },
  'minitrident.png': { cols: 4, rows: 2 },
    };
    const declaredGridCols = Number.isFinite(definition.gridCols) && definition.gridCols > 0 ? definition.gridCols : null;
    const declaredGridRows = Number.isFinite(definition.gridRows) && definition.gridRows > 0 ? definition.gridRows : null;
    if (declaredGridCols && declaredGridRows) {
      if (!frameWidth) frameWidth = Math.floor(w / declaredGridCols);
      if (!frameHeight) frameHeight = Math.floor(h / declaredGridRows);
    } else if (staticManualOverrides[normalizedSrc] || staticManualOverrides[srcBase]) {
      const mo = staticManualOverrides[normalizedSrc] || staticManualOverrides[srcBase];
      if (mo.frameWidth && mo.frameHeight) {
        frameWidth = frameWidth || mo.frameWidth;
        frameHeight = frameHeight || mo.frameHeight;
      } else if (mo.cols && mo.rows) {
        if (!frameWidth) frameWidth = Math.floor(w / mo.cols);
        if (!frameHeight) frameHeight = Math.floor(h / mo.rows);
      }
    }

    // If still missing, attempt to detect a grid by testing common column/row divisors.
    if (!frameWidth || !frameHeight) {
      const commonCols = [1, 2, 3, 4, 5, 6, 8, 10, 12];
      const commonRows = [1, 2, 3, 4, 5, 6];
      let best = null;
      for (const cols of commonCols) {
        if (w % cols !== 0) continue;
        for (const rows of commonRows) {
          if (h % rows !== 0) continue;
          const fw = w / cols;
          const fh = h / rows;
          if (fw < 8 || fh < 8 || fw > 512 || fh > 512) continue;
          const frameCount = cols * rows;
          if (frameCount <= 1) continue;
          // Score: prefer more frames and smaller, more square frames
          const squareness = Math.abs(fw - fh);
          const score = squareness + (fw + fh) / 256 - Math.log(frameCount);
          if (!best || score < best.score) {
            best = { cols, rows, fw: Math.floor(fw), fh: Math.floor(fh), score };
          }
        }
      }

      if (best) {
        frameWidth = frameWidth || best.fw;
        frameHeight = frameHeight || best.fh;
      }
    }

    // Fallback: if not found yet, try gcd heuristic (square grid) then single-row strip
    if (!frameWidth || !frameHeight) {
      const g = gcd(w, h);
      if (g > 1 && w % g === 0 && h % g === 0) {
        // square grid
        frameWidth = frameWidth || g;
        frameHeight = frameHeight || g;
      } else {
        // fallback: assume a single horizontal strip where each frame is image.height
        frameHeight = frameHeight || h;
        frameWidth = frameWidth || frameHeight;
      }
    }
  }

  const clip = new AnimationClip(image, frameWidth, frameHeight, definition.frameRate, definition);
  if (Array.isArray(definition.frameMap) && definition.frameMap.length) {
    clip.frameMap = definition.frameMap.slice();
  }
  return clip;
}

function extractFrame(image, frameWidth, frameHeight, frameIndex = 0) {
  const fw = frameWidth || image.width;
  const fh = frameHeight || image.height;
  const columns = Math.max(1, Math.floor(image.width / fw));
  const sx = (frameIndex % columns) * fw;
  const sy = Math.floor(frameIndex / columns) * fh;
  const frameCanvas = document.createElement("canvas");
  frameCanvas.width = fw;
  frameCanvas.height = fh;
  const frameCtx = frameCanvas.getContext("2d");
  frameCtx.drawImage(image, sx, sy, fw, fh, 0, 0, fw, fh);
  return frameCanvas;
}

function extractFrames(image, frameWidth, frameHeight) {
  const frames = [];
  if (!image) return frames;
  const fw = frameWidth || image.width;
  const fh = frameHeight || image.height;
  const cols = Math.max(1, Math.floor(image.width / fw));
  const rows = Math.max(1, Math.floor(image.height / fh));
  const total = Math.max(1, cols * rows);
  for (let i = 0; i < total; i += 1) {
    frames.push(extractFrame(image, fw, fh, i));
  }
  return frames;
}

async function loadCozyNpcAssets(cache) {
  const makeWalkKey = (filename) => filename.replace("_walk.png", "").replace(".png", "");
  const makeHurtKey = (filename) => filename.replace("_hurt.png", "").replace(".png", "");
  const mapHurtFilename = (filename) =>
    NPC_HURT_FILENAME_OVERRIDES[filename] || filename.replace("_walk.png", "_hurt.png");

  const baseWalk = await loadCachedImage(cache, `${NPC_WALK_ROOT}/${NPC_BASE_VARIANT}`);
  const baseHurt = await loadCachedImage(cache, `${NPC_COZY_HURT_ROOT}/${NPC_BASE_HURT_VARIANT}`);
  const eyes = await loadCachedImage(cache, `${NPC_WALK_ROOT}/eyes/${NPC_EYE_LAYER}`);

  const loadVariantGroup = async (folder, filenames) => {
    const walkRoot = `${NPC_WALK_ROOT}/${folder}`;
    const hurtRoot = `${NPC_COZY_HURT_ROOT}/${folder}`;

    if (folder === "hair") {
      const walkMap = {};
      const hurtMap = {};
      for (const filename of filenames) {
        const baseKey = makeWalkKey(filename);
        const walkSrc = `${walkRoot}/${filename}`;
        const hurtFilename = mapHurtFilename(filename);
        const hurtSrc = `${hurtRoot}/${hurtFilename}`;
        let walkImage = null;
        let hurtImage = null;
        try {
          walkImage = await loadCachedImage(cache, walkSrc);
        } catch (error) {
          walkImage = null;
        }
        try {
          hurtImage = await loadCachedImage(cache, hurtSrc);
        } catch (error) {
          hurtImage = null;
        }

        if (walkImage && walkImage.width && walkImage.height) {
          const walkVariantWidth = NPC_FRAME_WIDTH * NPC_COZY_WALK_FRAME_COUNT;
          const walkColors = Math.max(1, Math.floor(walkImage.width / walkVariantWidth));
          let hurtColors = walkColors;
          if (hurtImage && hurtImage.width && hurtImage.height) {
            const hurtVariantWidth = NPC_FRAME_WIDTH;
            hurtColors = Math.max(1, Math.floor(hurtImage.width / hurtVariantWidth));
          }
          const colorCount = Math.max(1, Math.min(walkColors, hurtColors));
          for (let idx = 0; idx < colorCount; idx += 1) {
            const key = `${baseKey}__c${idx}`;
            walkMap[key] = {
              __sourceImage: walkImage,
              __frameOffsetX: idx * walkVariantWidth,
              __frameOffsetY: 0,
            };
            if (hurtImage) {
              hurtMap[key] = {
                __sourceImage: hurtImage,
                __frameOffsetX: idx * NPC_FRAME_WIDTH,
                __frameOffsetY: 0,
              };
            } else {
              hurtMap[key] = walkMap[key];
            }
          }
          continue;
        }
        // Final fallback to single-color hair sprites (no variants).
        if (walkImage) {
          walkMap[baseKey] = walkImage;
          hurtMap[baseKey] = hurtImage || walkImage;
        }
      }
      return { walk: walkMap, hurt: hurtMap };
    }

    if (folder === "acc") {
      const walkMap = {};
      const hurtMap = {};
      for (const filename of filenames) {
        const baseKey = makeWalkKey(filename);
        const walkSrc = `${walkRoot}/${filename}`;
        const hurtFilename = mapHurtFilename(filename);
        const hurtSrc = `${hurtRoot}/${hurtFilename}`;
        let walkImage = null;
        let hurtImage = null;
        try {
          walkImage = await loadCachedImage(cache, walkSrc);
        } catch (error) {
          walkImage = null;
        }
        try {
          hurtImage = await loadCachedImage(cache, hurtSrc);
        } catch (error) {
          hurtImage = null;
        }
        if (walkImage) {
          walkMap[baseKey] = walkImage;
          hurtMap[baseKey] = hurtImage || walkImage;
        }
      }
      return { walk: walkMap, hurt: hurtMap };
    }

    const walkEntries = await Promise.all(
      filenames.map(async (filename) => {
        const src = `${walkRoot}/${filename}`;
        const image = await loadCachedImage(cache, src);
        return [makeWalkKey(filename), image];
      }),
    );
    const walkMap = Object.fromEntries(walkEntries);

    const hurtEntries = await Promise.all(
      filenames.map(async (filename) => {
        const mapped = mapHurtFilename(filename);
        const src = `${hurtRoot}/${mapped}`;
        try {
          const image = await loadCachedImage(cache, src);
          const hurtKey = makeHurtKey(mapped);
          return [hurtKey, image];
        } catch (error) {
          return [makeWalkKey(filename), null];
        }
      }),
    );
    const hurtRaw = Object.fromEntries(hurtEntries);
    const hurtMap = {};
    for (const [key, image] of Object.entries(walkMap)) {
      const mappedKey = NPC_HURT_VARIANT_REMAP[key] || key;
      hurtMap[key] = hurtRaw[mappedKey] || null;
    }
    return { walk: walkMap, hurt: hurtMap };
  };

  const loadShoes = async (suffix) => {
    const root = suffix === "walk" ? `${NPC_WALK_ROOT}/clothes` : `${NPC_COZY_HURT_ROOT}/clothes`;
    const filename = suffix === "walk" ? NPC_SHOES_LAYER : mapHurtFilename(NPC_SHOES_LAYER);
    try {
      return await loadCachedImage(cache, `${root}/${filename}`);
    } catch (error) {
      return null;
    }
  };

  const hairVariants = await loadVariantGroup("hair", NPC_HAIR_VARIANTS);
  const clothingVariants = await loadVariantGroup("clothes", NPC_CLOTHING_VARIANTS);
  const accessoryVariants = await loadVariantGroup("acc", NPC_ACCESSORY_VARIANTS);
  const shoesWalk = await loadShoes("walk");
  const shoesHurt = await loadShoes("hurt");

  let shadow = null;
  try {
    shadow = await loadCachedImage(cache, NPC_SHADOW_PATH);
  } catch (error) {
    shadow = null;
  }

  return {
    shadow,
    eyes,
    walk: {
      base: baseWalk,
      shoes: shoesWalk,
      hair: hairVariants.walk,
      clothes: clothingVariants.walk,
      accessories: accessoryVariants.walk,
    },
    hurt: {
      base: baseHurt,
      shoes: shoesHurt,
      hair: hairVariants.hurt,
      clothes: clothingVariants.hurt,
      accessories: accessoryVariants.hurt,
    },
  };
}

async function loadCoinAssets(cache) {
  const frames = await Promise.all(
    COIN_FRAME_FILES.map((file) => loadCachedImage(cache, `${ITEM_SPRITE_ROOT}/${file}`)),
  );
  return { coinFrames: frames };
}

async function loadPlayerAssets(cache, assets) {
  const playerEntries = Object.entries(ASSET_MANIFEST.player).map(
    async ([key, def]) => {
      assets.player[key] = await loadAnimationClip(def, cache);
    },
  );
  await Promise.all(playerEntries);
}

async function loadProjectileAssets(cache, assets) {
  const projectileEntries = Object.entries(ASSET_MANIFEST.projectiles).map(
    async ([key, def]) => {
      assets.projectiles[key] = await loadAnimationClip(def, cache);
    },
  );
  await Promise.all(projectileEntries);
}

// Load only the enemies needed for MapScreen (miniImp, miniDemonLord)
async function loadMapEnemyAssets(cache, assets) {
  const mapEnemies = ['miniImp', 'miniDemonLord'];
  const enemyTypes = Object.entries(ASSET_MANIFEST.enemies)
    .filter(([enemyName]) => mapEnemies.includes(enemyName))
    .map(async ([enemyName, enemyDefs]) => {
      assets.enemies[enemyName] = {};
      const loaders = Object.entries(enemyDefs).map(async ([state, def]) => {
        const clip = await loadAnimationClip(def, cache);
        assets.enemies[enemyName][state] = clip;
      });
      await Promise.all(loaders);
      try {
        applyExplicitEnemyFrameMaps(enemyName, assets.enemies[enemyName]);
      } catch (e) {}
    });
  await Promise.all(enemyTypes);
}

// Load all remaining enemies (excludes already-loaded map enemies)
async function loadEnemyAssets(cache, assets, skipMapEnemies = false) {
  const mapEnemies = ['miniImp', 'miniDemonLord'];
  const enemyTypes = Object.entries(ASSET_MANIFEST.enemies)
    .filter(([enemyName]) => !skipMapEnemies || !mapEnemies.includes(enemyName))
    .map(async ([enemyName, enemyDefs]) => {
      assets.enemies[enemyName] = {};
      const loaders = Object.entries(enemyDefs).map(async ([state, def]) => {
        const clip = await loadAnimationClip(def, cache);
        assets.enemies[enemyName][state] = clip;
      });
      await Promise.all(loaders);
      try {
        if (MINIFOLKS.some((m) => m.key === enemyName)) {
          const maps = generateDefaultFrameMapsForMini(enemyName, assets.enemies[enemyName]);
          if (maps) {
            for (const [st, arr] of Object.entries(maps)) {
              if (assets.enemies[enemyName][st] && (!assets.enemies[enemyName][st].frameMap || !assets.enemies[enemyName][st].frameMap.length)) {
                assets.enemies[enemyName][st].frameMap = arr.slice();
              }
            }
          }
        }
        try {
          applyExplicitEnemyFrameMaps(enemyName, assets.enemies[enemyName]);
        } catch (e) {}
      } catch (e) {}
    },
  );
  await Promise.all(enemyTypes);
}

async function loadObstacleAssets(cache, assets) {
  const obstacleEntries = Object.entries(OBSTACLE_DEFS).map(
    async ([key, def]) => {
      if (!cache.has(def.src)) {
        cache.set(def.src, loadImage(def.src));
      }
      const image = await cache.get(def.src);
      assets.obstacles[key] = {
        image,
        scale: def.scale,
        collisionRadius: def.collisionRadius,
      };
    },
  );
  await Promise.all(obstacleEntries);
}

async function loadWeaponDropAssets(cache, assets) {
  const weaponDropEntries = Object.entries(WEAPON_DROP_DEFS).map(
    async ([key, def]) => {
      let frames = null;
      let baseFrame = null;
      if (Array.isArray(def.frameSources) && def.frameSources.length) {
        frames = [];
        for (const src of def.frameSources) {
          if (!cache.has(src)) {
            cache.set(src, loadImage(src));
          }
          const img = await cache.get(src);
          frames.push(img);
        }
        baseFrame = frames[0] || null;
      } else if (def.src) {
        if (!cache.has(def.src)) {
          cache.set(def.src, loadImage(def.src));
        }
        const image = await cache.get(def.src);
        const fw = def.frameWidth || 0;
        const fh = def.frameHeight || 0;
        if (fw > 0 && fh > 0) {
          frames = extractFrames(image, fw, fh);
          const index = Math.max(0, def.frameIndex || 0);
          baseFrame = frames[index] || frames[0] || image;
        } else {
          baseFrame = extractFrame(image, fw, fh, def.frameIndex || 0);
        }
      }
      const imageRef = baseFrame || (frames && frames[0]) || null;
      let iconImage = null;
      if (def.iconSrc) {
        if (!cache.has(def.iconSrc)) {
          cache.set(def.iconSrc, loadImage(def.iconSrc));
        }
        iconImage = await cache.get(def.iconSrc);
      }
      assets.weaponPickups[key] = { image: imageRef, frames, iconImage, ...def };
    },
  );
  await Promise.all(weaponDropEntries);
}

async function loadUtilityAssets(cache, assets) {
  const utilityEntries = Object.entries(UTILITY_POWERUP_DEFS).map(
    async ([key, def]) => {
      if (!cache.has(def.src)) {
        cache.set(def.src, loadImage(def.src));
      }
      const image = await cache.get(def.src);
      let iconImage = null;
      if (def.iconSrc) {
        if (!cache.has(def.iconSrc)) {
          cache.set(def.iconSrc, loadImage(def.iconSrc));
        }
        iconImage = await cache.get(def.iconSrc);
      }
      assets.utility[key] = { image, iconImage, ...def };
    },
  );
  await Promise.all(utilityEntries);
}

async function loadChurchPowerupAssets(cache, assets) {
  const powerupEntries = Object.entries(CHURCH_POWERUP_DEFS).map(
    async ([key, def]) => {
      let frames = null;
      let baseFrame = null;
      if (Array.isArray(def.frameSources) && def.frameSources.length) {
        frames = [];
        for (const src of def.frameSources) {
          if (!cache.has(src)) {
            cache.set(src, loadImage(src));
          }
          const img = await cache.get(src);
          frames.push(img);
        }
        baseFrame = frames[0] || null;
      } else if (def.src) {
        if (!cache.has(def.src)) {
          cache.set(def.src, loadImage(def.src));
        }
        const image = await cache.get(def.src);
        const fw = def.frameWidth || 0;
        const fh = def.frameHeight || 0;
        if (fw > 0 && fh > 0) {
          frames = extractFrames(image, fw, fh);
          const index = Math.max(0, def.frameIndex || 0);
          baseFrame = frames[index] || frames[0] || image;
        } else {
          baseFrame = extractFrame(image, fw, fh, def.frameIndex || 0);
        }
      }
      const imageRef = baseFrame || (frames && frames[0]) || null;
      let iconImage = null;
      if (def.iconSrc) {
        if (!cache.has(def.iconSrc)) {
          cache.set(def.iconSrc, loadImage(def.iconSrc));
        }
        iconImage = await cache.get(def.iconSrc);
      }
      assets.churchPowerups[key] = { image: imageRef, frames, iconImage, ...def };
    },
  );
  await Promise.all(powerupEntries);
}

async function loadProjectileFrames(cache, assets, projectileFrames) {
  // Faith cannon frames
  const faithCannonClip = assets.projectiles?.faith_cannon;
  if (faithCannonClip && faithCannonClip.image) {
    const faithCannonFrames = extractFrames(
      faithCannonClip.image,
      faithCannonClip.frameWidth || faithCannonClip.image.width,
      faithCannonClip.frameHeight || faithCannonClip.image.height,
    );
    if (faithCannonFrames.length) {
      projectileFrames.faith_cannon = faithCannonFrames;
    }
  }

  // Mini trident frames
  try {
    const tridentClip = assets.projectiles?.miniTrident;
    if (tridentClip && tridentClip.image) {
      const frames = getFramesForClip(tridentClip);
      if (frames && frames.length) {
        projectileFrames.miniTrident = frames;
      }
    }
  } catch (e) {
    console.debug && console.debug('miniTrident frame extraction failed', e);
  }

  // Mini fireball uses the exact same clip as the player's default arrow projectile.
  if (assets.projectiles?.arrow) {
    assets.projectiles.miniFireball = assets.projectiles.arrow;
  }

  // Word of God frames
  projectileFrames.word_of_god = await Promise.all(
    WORD_OF_GOD_FRAME_FILES.map((file) => loadCachedImage(cache, file)),
  );

  // Fire and wisdom missile frames
  projectileFrames.fire = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      loadImage(`assets/sprites/projectiles/fire-missile/fire-missile${i + 1}.png`),
    ),
  );
  projectileFrames.wisdom_missle = await Promise.all(
    WISDOM_FRAME_SOURCES.map((src) => loadImage(src)),
  );
  projectileFrames.demonLordFireball = await Promise.all(
    DEMON_LORD_FIREBALL_FRAME_FILES.map((src) => loadCachedImage(cache, src)),
  );
  projectileFrames.fireOrb = Array.isArray(projectileFrames.demonLordFireball)
    ? projectileFrames.demonLordFireball.slice()
    : [];
  if (projectileFrames.fireOrb.length) {
    assets.projectiles.fireOrb = { frames: projectileFrames.fireOrb };
  }
}

async function loadEffectAssets(cache, assets) {
  assets.effects.verticalPuff = await Promise.all(
    Array.from({ length: 9 }, (_, i) =>
      loadImage(`${MAGIC_PACK_ROOT}/vertical-puff/vertical-puff${i + 1}.png`).then(
        (img) => extractFrame(img, img.width, img.height, 0),
      ),
    ),
  );
  assets.effects.impactDust = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      loadImage(`${MAGIC_PACK_ROOT}/impact-dust/impact-dust${i + 1}.png`).then((img) =>
        extractFrame(img, img.width, img.height, 0),
      ),
    ),
  );
  assets.effects.flash = await Promise.all(
    Array.from({ length: 14 }, (_, i) =>
      loadImage(`${MAGIC_PACK_ROOT}/flash/flash${i + 1}.png`).then((img) =>
        extractFrame(img, img.width, img.height, 0),
      ),
    ),
  );
  assets.effects.sentryBurn = await loadImage(
    "assets/sprites/projectiles/tormentor-flame/Group-4-1.png",
  ).then((img) => extractFrames(img, 32, 48));
  assets.effects.visitorHeartHit = await Promise.all(
    Array.from({ length: 6 }, (_, i) =>
      loadImage(`${MAGIC_PACK_ROOT}/puff/puff${i + 1}.png`).then((img) =>
        extractFrame(img, img.width, img.height, 0),
      ),
    ),
  );
  assets.effects.magicImpact = await Promise.all(
    Array.from({ length: FLASH_FRAME_COUNT }, (_, i) =>
      loadImage(`${MAGIC_FLASH_SPRITE_PATH}/flash${i + 1}.png`),
    ),
  );
  assets.effects.puff = await Promise.all(
    Array.from({ length: 6 }, (_, i) =>
      loadImage(`${MAGIC_PACK_ROOT}/puff/puff${i + 1}.png`).then((img) =>
        extractFrame(img, img.width, img.height, 0),
      ),
    ),
  );
  assets.effects.enemyDeathExplosion = await loadImage(
    "assets/sprites/explosions/16/Explosion VFX 16(48x48).png",
  ).then((img) => extractFrames(img, 48, 48).slice(0, 10));
  assets.effects.enemyDeathExplosionAlt = await loadImage(
    "assets/sprites/explosions/17/Explosion VFX 17(48x64).png",
  ).then((img) => extractFrames(img, 48, 64).slice(0, 10));
  assets.effects.enemyDeathExplosionAlt2 = await loadImage(
    "assets/sprites/explosions/3/Explosion VFX 3(48x48).png",
  ).then((img) => extractFrames(img, 48, 48).slice(0, 10));
  assets.effects.prayerBombExplosion = await loadImage(
    "assets/sprites/explosions/Explosion VFX 21/Explosion VFX 21(64x64).png",
  ).then((img) => extractFrames(img, 64, 64));
  assets.effects.magicSplash = await Promise.all(
    Array.from({ length: FLASH_FRAME_COUNT }, (_, i) =>
      loadImage(`${MAGIC_FLASH_SPRITE_PATH}/flash${i + 1}.png`).then((img) =>
        extractFrame(img, img.width, img.height, 0),
      ),
    ),
  );
  assets.effects.chattyHeartHit = await loadImage(`assets/sprites/projectiles/ray/ray.png`).then((img) =>
    extractFrames(img, 78, 64),
  );
  assets.effects.chattyAppease = await loadImage(`assets/sprites/projectiles/blast/blast.png`).then((img) =>
    extractFrames(img, 64, 64),
  );
  assets.effects.raybolt = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      loadImage(`assets/sprites/projectiles/raybolt/Raybolt${i + 1}.png`).then((img) =>
        extractFrame(img, img.width, img.height, 0),
      ),
    ),
  );
  assets.effects.divineChargeSpark = await Promise.all(
    Array.from({ length: DIVINE_CHARGE_SPARK_COUNT }, (_, i) =>
      loadImage(`${DIVINE_CHARGE_SPARK_ROOT}/sparks${i + 1}.png`),
    ),
  );
  assets.effects.meleeSwoosh = await loadImage(MELEE_SWOOSH_PATH).catch(() => null);
  assets.effects.smoke = await Promise.all(
    Array.from({ length: 17 }, (_, i) =>
      loadImage(`${MAGIC_PACK_ROOT}/smoke/smoke${i + 1}.png`).then((img) =>
        extractFrame(img, img.width, img.height, 0),
      ),
    ),
  );
  assets.effects.prayerStormGroundFire = await Promise.all(
    PRAYER_STORM_GROUND_FIRE_SHEETS.map(async (src) => {
      const img = await loadCachedImage(cache, src);
      const frameWidth = Math.max(1, Math.floor(img.width / 14));
      return extractFrames(img, frameWidth, img.height).slice(0, 14);
    }),
  );
}

async function loadItemFrames(cache, assets, keyFramesPromise, torchFramesPromise, flagFramesPromise) {
  const keyFrames = (await keyFramesPromise).filter(Boolean);
  assets.items.gracePickup = {
    frames: keyFrames,
    icon: keyFrames[0] || null,
  };
  const torchFrames = (await torchFramesPromise).filter(Boolean);
  assets.items.torch = {
    frames: torchFrames,
    icon: torchFrames[0] || null,
  };
  const flagFrames = (await flagFramesPromise).filter(Boolean);
  assets.items.flag = {
    frames: flagFrames,
    icon: flagFrames[0] || null,
  };
}

async function loadBackgroundAssets(cache, assets) {
  const townIntroPromise = loadImage(TOWN_INTRO_BACKGROUND_PATH)
    .then((img) => {
      if (!assets.backgrounds) assets.backgrounds = { townIntro: null };
      assets.backgrounds.townIntro = img;
    })
    .catch(() => {
      if (!assets.backgrounds) assets.backgrounds = { townIntro: null };
      assets.backgrounds.townIntro = null;
    });
  const epiloguePromise = loadImage("assets/backgrounds/epilogue.jpg")
    .then((img) => {
      if (!assets.backgrounds) assets.backgrounds = { epilogue: null };
      assets.backgrounds.epilogue = img;
    })
    .catch(() => {
      if (!assets.backgrounds) assets.backgrounds = { epilogue: null };
      assets.backgrounds.epilogue = null;
    });
  const act2Promise = loadImage("assets/backgrounds/act2.jpg")
    .then((img) => {
      if (!assets.backgrounds) assets.backgrounds = {};
      assets.backgrounds.act2 = img;
    })
    .catch(() => {
      if (!assets.backgrounds) assets.backgrounds = {};
      assets.backgrounds.act2 = null;
    });
  const act3Promise = loadImage("assets/backgrounds/act3.jpg")
    .then((img) => {
      if (!assets.backgrounds) assets.backgrounds = {};
      assets.backgrounds.act3 = img;
    })
    .catch(() => {
      if (!assets.backgrounds) assets.backgrounds = {};
      assets.backgrounds.act3 = null;
    });
  const gameOverBackgroundPromise = loadImage("assets/backgrounds/game-over.jpg")
    .then((img) => {
      if (!assets.backgrounds) assets.backgrounds = { gameOver: null };
      assets.backgrounds.gameOver = img;
    })
    .catch(() => {
      if (!assets.backgrounds) assets.backgrounds = { gameOver: null };
      assets.backgrounds.gameOver = null;
    });
  const midPromise = loadImage(BACKGROUND_MID_PATH)
    .then((img) => { assets.backgroundLayers.mid = img; })
    .catch(() => { assets.backgroundLayers.mid = null; });
  const floorPromise = loadImage("assets/backgrounds/floor.png")
    .then((img) => { assets.backgroundLayers.floor = img; })
    .catch(() => { assets.backgroundLayers.floor = null; });
  const titleBackgroundPromise = loadImage(TITLE_BACKGROUND_PATH)
    .then((img) => { assets.titleBackground = img; })
    .catch(() => { assets.titleBackground = null; });

  await Promise.all([
    townIntroPromise,
    epiloguePromise,
    act2Promise,
    act3Promise,
    gameOverBackgroundPromise,
    midPromise,
    floorPromise,
    titleBackgroundPromise,
  ]);
}

// Phase 1: Load only what's needed for title screen and map navigation
async function loadTitleMapAssets() {
  const cache = new Map();
  const assets = {
    player: {},
    projectiles: {},
    enemies: {},
    obstacles: {},
    weaponPickups: {},
    churchPowerups: {},
    utility: {},
    effects: {},
    background: null,
    backgrounds: { townIntro: null },
    backgroundLayers: { far: null, mid: null, floor: null },
    npcs: null,
    items: {},
  };
  // Load title background
  try {
    assets.titleBackground = await loadImage(TITLE_BACKGROUND_PATH);
  } catch (e) {
    console.warn("Failed to load title background:", e);
  }
  // Load map screen enemy animations (miniImp, miniDemonLord)
  await loadMapEnemyAssets(cache, assets);
  loadingProgress = 15;
  return { assets, cache };
}

// Phase 2: Load all remaining gameplay assets
async function loadGameplayAssets(cache, assets) {
  projectileFrames = {};
  const npcAssetsPromise = loadCozyNpcAssets(cache);
  const coinAssetsPromise = loadCoinAssets(cache);
  const keyFramesPromise = Promise.all(
    GRACE_SPRITE_FILES.map(async (src) => {
      if (!cache.has(src)) {
        cache.set(src, loadImage(src));
      }
      try {
        const img = await cache.get(src);
        return extractFrame(img, img.width, img.height, 0);
      } catch (err) {
        console.warn && console.warn("Failed to load key frame", src, err);
        return null;
      }
    }),
  );
  const torchFramesPromise = Promise.all(
    [TORCH_SPRITE_FILE, TORCH_SPRITE_FILE, TORCH_SPRITE_FILE, TORCH_SPRITE_FILE].map(
      async (src) => {
        if (!cache.has(src)) {
          cache.set(src, loadImage(src));
        }
        try {
          const img = await cache.get(src);
          return extractFrame(img, img.width, img.height, 0);
        } catch (err) {
          console.warn && console.warn("Failed to load torch frame", src, err);
          return null;
        }
      },
    ),
  );
  const flagFramesPromise = Promise.all(
    [FLAG_SPRITE_FILE, FLAG_SPRITE_FILE, FLAG_SPRITE_FILE, FLAG_SPRITE_FILE].map(
      async (src) => {
        if (!cache.has(src)) {
          cache.set(src, loadImage(src));
        }
        try {
          const img = await cache.get(src);
          return extractFrame(img, img.width, img.height, 0);
        } catch (err) {
          console.warn && console.warn("Failed to load flag frame", src, err);
          return null;
        }
      },
    ),
  );

  // Track loading progress (continues from phase 1 at 15%)
  loadingProgress = 20;
  await Promise.all([
    loadPlayerAssets(cache, assets),
    loadProjectileAssets(cache, assets),
    loadEnemyAssets(cache, assets, true), // Skip map enemies (already loaded)
    loadObstacleAssets(cache, assets),
    loadWeaponDropAssets(cache, assets),
    loadChurchPowerupAssets(cache, assets),
    loadUtilityAssets(cache, assets),
    loadBackgroundAssets(cache, assets),
    npcAssetsPromise,
    coinAssetsPromise,
  ]);
  loadingProgress = 60;

  assets.npcs = await npcAssetsPromise;
  assets.items = await coinAssetsPromise;
  loadingProgress = 75;

  // Load frames and effects in parallel (they're independent)
  await Promise.all([
    loadProjectileFrames(cache, assets, projectileFrames),
    loadEffectAssets(cache, assets),
    loadItemFrames(cache, assets, keyFramesPromise, torchFramesPromise, flagFramesPromise),
  ]);
  loadingProgress = 100;

  return assets;
}

// Backwards-compatible wrapper that loads everything
async function loadAssets() {
  const { assets, cache } = await loadTitleMapAssets();
  await loadGameplayAssets(cache, assets);
  return assets;
}

function normalizeVector(x, y) {
  const length = Math.hypot(x, y);
  if (!length) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
}

function rotateVector(vector, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: vector.x * cos - vector.y * sin,
    y: vector.x * sin + vector.y * cos,
  };
}

function distancePointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

function distanceToEdge(x, y, dx, dy) {
  const epsilon = 1e-6;
  let maxDistance = Infinity;

  if (Math.abs(dx) > epsilon) {
    const tx1 = (0 - x) / dx;
    const tx2 = (canvas.width - x) / dx;
    const tx = dx > 0 ? tx2 : tx1;
    if (tx > 0) maxDistance = Math.min(maxDistance, tx);
  }

  if (Math.abs(dy) > epsilon) {
    const ty1 = (0 - y) / dy;
    const ty2 = (canvas.height - y) / dy;
    const ty = dy > 0 ? ty2 : ty1;
    if (ty > 0) maxDistance = Math.min(maxDistance, ty);
  }

  if (!Number.isFinite(maxDistance)) {
    maxDistance = Math.max(canvas.width, canvas.height);
  }

  return Math.max(0, maxDistance);
}

function distanceToArenaEdge(x, y, dx, dy) {
  const epsilon = 1e-6;
  let maxDistance = Infinity;
  const minY = HUD_HEIGHT;
  const maxY = canvas.height;

  if (Math.abs(dx) > epsilon) {
    const tx1 = (0 - x) / dx;
    const tx2 = (canvas.width - x) / dx;
    const tx = dx > 0 ? tx2 : tx1;
    if (tx > 0) maxDistance = Math.min(maxDistance, tx);
  }

  if (Math.abs(dy) > epsilon) {
    const ty1 = (minY - y) / dy;
    const ty2 = (maxY - y) / dy;
    const ty = dy > 0 ? ty2 : ty1;
    if (ty > 0) maxDistance = Math.min(maxDistance, ty);
  }

  if (!Number.isFinite(maxDistance)) {
    maxDistance = Math.max(canvas.width, canvas.height);
  }

  return Math.max(0, maxDistance);
}

function approachAngle(current, target, maxDelta) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) <= maxDelta) return target;
  return current + Math.sign(diff) * maxDelta;
}

function getNpcTimerScale() {
  return 1;
}

function beginStartCountdown() {
  if (!START_COUNTDOWN_SEQUENCE.length) {
    needsCountdown = false;
    countdownState = null;
    return;
  }
  const first = START_COUNTDOWN_SEQUENCE[0];
  countdownState = {
    index: 0,
    timer: first.duration,
    label: first.label,
    active: true,
  };
}

function cancelStartCountdown() {
  if (countdownState) {
    countdownState = null;
  }
}

function updateStartCountdown(dt) {
  if (!countdownState || !countdownState.active) return false;
  countdownState.timer -= dt;
  while (countdownState.timer <= 0 && countdownState.active) {
    countdownState.index += 1;
    if (countdownState.index >= START_COUNTDOWN_SEQUENCE.length) {
      countdownState.active = false;
      countdownState.label = null;
      needsCountdown = false;
      return true;
    }
    const nextStep = START_COUNTDOWN_SEQUENCE[countdownState.index];
    countdownState.label = nextStep.label;
    countdownState.timer += nextStep.duration;
  }
  return false;
}

function isStartCountdownActive() {
  return Boolean(countdownState?.active);
}

function getStartCountdownLabel() {
  return countdownState?.active ? countdownState.label : null;
}

const uiTexts =
  (typeof window !== "undefined" && window.BattlechurchUIText) || {};
const TITLE_OVERLAY_BODY = "";

function typewriterElement(overlay, selector, text, msPerChar = 18) {
  if (!overlay) return;
  const target = overlay.querySelector(selector);
  if (!target) return;
  if (target.__typeTimer) clearInterval(target.__typeTimer);
  let idx = 0;
  const payload = String(text || "");
  const previousDisplay = target.style.display;
  const previousTextAlign = target.style.textAlign;
  const previousWidth = target.style.width;
  const previousMaxWidth = target.style.maxWidth;
  const previousWhiteSpace = target.style.whiteSpace;
  target.style.display = "inline-block";
  target.style.textAlign = "left";
  target.style.maxWidth = "100%";
  target.style.whiteSpace = "pre-line";
  target.textContent = payload;
  const fullWidth = Math.ceil(target.getBoundingClientRect().width || 0);
  target.style.width = fullWidth ? `${fullWidth}px` : target.style.width;
  target.textContent = "";
  target.__typeTimer = setInterval(() => {
    idx += 1;
    target.textContent = payload.slice(0, idx);
    if (idx >= payload.length) {
      clearInterval(target.__typeTimer);
      target.__typeTimer = null;
      target.style.display = previousDisplay;
      target.style.textAlign = previousTextAlign;
      target.style.width = previousWidth;
      target.style.maxWidth = previousMaxWidth;
      target.style.whiteSpace = previousWhiteSpace;
    }
  }, msPerChar);
}

function typewriterText(target, text, msPerChar = 18, onComplete = null) {
  if (!target) return;
  if (target.__typeTimer) clearInterval(target.__typeTimer);
  const payload = String(text || "");
  const previousWhiteSpace = target.style.whiteSpace;
  target.style.whiteSpace = "pre-line";
  target.textContent = "";
  let idx = 0;
  target.__typeTimer = setInterval(() => {
    idx += 1;
    target.textContent = payload.slice(0, idx);
    if (idx >= payload.length) {
      clearInterval(target.__typeTimer);
      target.__typeTimer = null;
      target.style.whiteSpace = previousWhiteSpace;
      if (typeof onComplete === "function") onComplete();
    }
  }, msPerChar);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showTownIntroDialog() {
  if (!window.DialogOverlay) return false;
  const body =
    "You are the new pastor to the last church in a town under spiritual attack. Grow your congregation in one year, or the town falls with you.";
  window.DialogOverlay.show({
    title: "",
    bodyHtml: `<div class="town-intro-text"></div>`,
    buttonText: "Continue",
    variant: "town-intro",
    devLabel: "",
    onRender: ({ overlay }) => startMissionTypewriter(overlay, body, 18),
    onContinue: () => {
      if (window.DialogOverlay?.hide) {
        window.DialogOverlay.hide();
      }
      paused = false;
      if (levelManager && typeof levelManager.startBriefing === "function") {
        levelManager.startBriefing(1);
      } else if (levelManager && typeof levelManager.advanceFromBriefing === "function") {
        levelManager.advanceFromBriefing(1);
      }
    },
  });
  return true;
}

function queueTownIntroAnnouncement() {
  const act1Title = (typeof GameText !== 'undefined' && GameText.battleActs?.[1]) || "Mission I: Foothold";
  const mapData = typeof window !== "undefined" ? window.BattlechurchMapData : null;
  const townName = mapData?.towns?.find((t) => t.id === activeTownId)?.name || "this town";
  const act1Subtitle = `Win 3 battles to secure a foothold in ${townName}.`;
  pendingTownIntroStart = true;
  queueLevelAnnouncement(act1Subtitle, "", { requiresConfirm: true, skipMissionBrief: true, townIntro: true });
}

function queueExteriorShotAnnouncement({ force = false } = {}) {
  const monthName = getUpcomingMonthName();
  if (!monthName) return;
  const status = levelManager?.getStatus ? levelManager.getStatus() : null;
  const orderHeadings = (typeof GameText !== 'undefined' && GameText.battleActs) || {
    1: "Mission I: Establish a Foothold",
    2: "Mission II: Repel the Counter Attack",
    3: "Mission III: Liberate the Town",
  };
  const missionNumber = Math.max(
    1,
    Number.isFinite(status?.battle) ? status.battle : 1,
  );
  const orderNumber = Math.max(1, Number.isFinite(status?.level) ? status.level : 1);
  const bossBattleNumber =
    typeof window !== "undefined" && Number.isFinite(window.MONTHS_PER_LEVEL)
      ? window.MONTHS_PER_LEVEL
      : 4;
  // Check if this is a boss exterior - either by battle number OR by pending boss flag (from dev hotkey 5)
  const isBossExterior = pendingBossIntroAfterExterior ||
    (Number.isFinite(status?.battle) && status.battle >= bossBattleNumber);
  const battleTitle = isBossExterior
    ? `Battle ${bossBattleNumber}`
    : (orderHeadings[orderNumber] || monthName);
  const upcomingMissionNumber = isBossExterior
    ? bossBattleNumber
    : Math.max(1, (Number.isFinite(status?.battle) ? status.battle : 0) + 1);
  const upcomingOrderNumber = orderNumber;
  const shouldShowExterior = upcomingMissionNumber === 1;
  if (!shouldShowExterior) return;
  const visitorActive =
    visitorSession?.active || visitorSession?.summaryActive || visitorSession?.introActive;
  if (!force && (visitorActive || status?.pendingVisitorMinigame)) {
    pendingExteriorShotAfterVisitor = true;
    return;
  }
  pendingExteriorShotAfterVisitor = false;
  if (levelAnnouncements.some((announcement) => announcement?.exteriorShot)) return;
  queueLevelAnnouncement(battleTitle, "", {
    duration: 1.4,
    requiresConfirm: true,
    skipMissionBrief: true,
    exteriorShot: true,
    upcomingMissionNumber,
    upcomingOrderNumber,
  });
  if (typeof startExteriorMusic === "function") {
    startExteriorMusic({ boss: isBossExterior });
  }
}

function startTownIntroTransition() {
  if (townIntroTransitionActive) return;
  townIntroTransitionActive = true;
  townIntroTransitionTimer = 0;
  dismissCurrentLevelAnnouncement();
}

function queueInitialMonthAnnouncementFromCongregation() {
  const status = levelManager?.getStatus ? levelManager.getStatus() : null;
  const levelNumber = status?.level || 1;
  const globalMonthNumberForLevelStart = (levelNumber - 1) * MONTHS_PER_LEVEL + 1;
  const monthName = getMonthName(globalMonthNumberForLevelStart);
  suppressInitialAnnouncements = false;
  if (levelManager && typeof levelManager.setWaitingForCongregation === "function") {
    levelManager.setWaitingForCongregation(false);
  }
  queueLevelAnnouncement(`Level ${levelNumber}: ${monthName}`, "A new month of ministry begins", {
    duration: MONTH_INTRO_DURATION,
    requiresConfirm: true,
  });
  setDevStatus(`Preparing ${monthName}`, MONTH_INTRO_DURATION);
}

function startGameFromTitle() {
  // Don't start if assets haven't loaded yet
  if (!assetsLoaded) return;
  townVisitorMinigamePlayed = false;
  maxComboThisTown = 0;
  // Load campaign data (start count, multiplier, powerup restore)
  if (typeof window !== "undefined" && window.MapScreen?.getTownCampaignData) {
    const overrideCampaignData =
      titleDemoSaveOverride && titleDemoSaveOverride.townId === activeTownId
        ? titleDemoSaveOverride.campaignData
        : null;
    setDemoSandboxRunActive(Boolean(overrideCampaignData));
    const campaignData = overrideCampaignData || window.MapScreen.getTownCampaignData(activeTownId);
    activeCampaign = campaignData?.campaign || "p1";
    activeCampaignMultiplier = Number.isFinite(campaignData?.campaignMultiplier) ? campaignData.campaignMultiplier : 1.0;
    if (typeof window !== "undefined") window.activeCampaignMultiplier = activeCampaignMultiplier;
    townStartCongregation = Number.isFinite(campaignData?.startCount) ? campaignData.startCount : INITIAL_CONGREGATION_SIZE;
    resetChurchPowerups();
    // Restore church powerup levels from prior campaigns
    const restored = campaignData?.restoredChurchPowerupLevels || {};
    for (const [id, level] of Object.entries(restored)) {
      if (Number.isFinite(level) && level > 0) {
        churchPowerupLevels.set(id, level);
        unlockedChurchPowerups.add(id);
      }
    }
  } else {
    setDemoSandboxRunActive(false);
    activeCampaign = "p1";
    activeCampaignMultiplier = 1.0;
    if (typeof window !== "undefined") window.activeCampaignMultiplier = activeCampaignMultiplier;
    townStartCongregation = INITIAL_CONGREGATION_SIZE;
    resetChurchPowerups();
  }
  titleDemoSaveOverride = null;
  // Apply denominational upgrade powerups (free picks granted before County 2/3/4 towns)
  const _denomPowerups = typeof window !== "undefined" ? window.pendingDenomPowerups : null;
  if (Array.isArray(_denomPowerups) && _denomPowerups.length > 0) {
    const DENOM_POWERUP_LEVEL = 5;
    for (const _key of _denomPowerups) {
      if (CHURCH_POWERUP_DEFS[_key] && !CHURCH_POWERUP_DEFS[_key].disabled) {
        const _existing = churchPowerupLevels.get(_key) || 0;
        churchPowerupLevels.set(_key, Math.max(_existing, DENOM_POWERUP_LEVEL));
        unlockedChurchPowerups.add(_key);
      }
    }
    window.pendingDenomPowerups = null;
  }
  resetCongregationSize();
  // Ensure title is hidden and game is paused while we enter briefing.
  paused = true;
  needsCountdown = false;
  gameStarted = false;
  townIntroTransitionActive = false;
  townIntroTransitionTimer = 0;
  pendingBossIntroAfterExterior = false;
  startSpeedrunTimer();
  resetYearNpcPool();
  // Clear any previously queued announcements so the congregation doesn't show
  // immediately (init/restart may have queued them at startup).
  try {
    if (Array.isArray(levelAnnouncements)) levelAnnouncements.length = 0;
  } catch (e) {}
  try {
    titleScreenActive = false;
    if (typeof setTimeout === "function") {
      setTimeout(() => {
        queueTownIntroAnnouncement();
      }, 0);
      return;
    }
    queueTownIntroAnnouncement();
    return;
  } catch (e) {}
}

function startRunForTown(townId) {
  activeTownId = townId || null;
  mapActive = false;
  if (typeof window !== "undefined" && typeof window.MapScreen?.close === "function") {
    window.MapScreen.close();
  }
  if (typeof window !== "undefined") {
    window.activeTownId = activeTownId;
  }
  // activeCampaign and activeCampaignMultiplier are set inside startGameFromTitle via getTownCampaignData
  startGameFromTitle();
}

function exitMapScreen() {
  mapActive = false;
  titleScreenActive = true;
  titleDemoSaveMenuActive = false;
}

function returnToMapWithNextTown() {
  // Stop the game and return to map screen with next town selected
  paused = true;
  gameStarted = false;
  titleScreenActive = false;
  mapActive = true;
  pendingBossIntroAfterExterior = false;
  townVisitorMinigamePlayed = false;
  // Clear any pending announcements
  try {
    if (Array.isArray(levelAnnouncements)) levelAnnouncements.length = 0;
  } catch (e) {}
  // Reset level manager
  if (levelManager?.reset) levelManager.reset();
  // Select next town and open map
  if (window.MapScreen) {
    const nextTownId = window.MapScreen.getNextTownInOrder(activeTownId);
    if (nextTownId) {
      window.MapScreen.selectTown(nextTownId);
    }
    window.MapScreen.open();
  }
}

function returnToMapFromPause() {
  paused = false;
  gameStarted = false;
  titleScreenActive = false;
  mapActive = true;
  pendingBossIntroAfterExterior = false;
  townVisitorMinigamePlayed = false;
  window.isPauseOverlayActive = false;
  pauseRestartConfirmActive = false;
  // Clear any pending announcements
  try {
    if (Array.isArray(levelAnnouncements)) levelAnnouncements.length = 0;
  } catch (e) {}
  // Reset level manager
  if (levelManager?.reset) levelManager.reset();
  if (window.MapScreen) {
    if (activeTownId) {
      window.MapScreen.selectTown(activeTownId);
    }
    window.MapScreen.open();
  }
}

async function seedDemoSlotProgress(slot) {
  if (!slot || !slot.townId) return;
  const mapScreen = typeof window !== "undefined" ? window.MapScreen : null;
  if (typeof mapScreen?.setDemoProfile !== "function") return;
  mapScreen.setDemoProfile({
    completedTowns: Math.max(0, Number(slot.completedTowns) || 0),
  });
}

async function refreshTitleCloudSaveOption() {
  titleCloudSaveLoading = true;
  titleCloudSaveRows = [];
  titleCloudActiveSaveId = null;
  try {
    if (typeof window === "undefined") return;
    if (window.cloudAuthProvider !== "google") {
      titleCloudSaveLoading = false;
      titleCloudSaveRows = [];
      titleCloudSelectedSaveId = null;
      return;
    }
    if (window.MapScreen?.reloadProgress) {
      await window.MapScreen.reloadProgress();
    }
    if (typeof window.MapScreen?.getSaveFileSummaries !== "function") {
      titleCloudSaveLoading = false;
      titleCloudSaveRows = [];
      titleCloudSelectedSaveId = null;
      return;
    }
    const summary = window.MapScreen.getSaveFileSummaries();
    const saves = Array.isArray(summary?.saves) ? summary.saves : [];
    titleCloudActiveSaveId = summary?.activeSaveId || null;
    titleCloudSaveRows = saves.map((save) => {
      const completed = Number.isFinite(save?.completedP1Towns) ? save.completedP1Towns : 0;
      const total = Math.max(1, Number.isFinite(save?.totalTowns) ? save.totalTowns : 10);
      const progressLabel = completed > 0 ? `(${completed}/${total})` : "(No progress yet)";
      const suggestedTownName = save?.suggestedTownName || "Pine Hollow";
      const townRows = Array.isArray(save?.townProgressRows) ? save.townProgressRows : [];
      const completedTownRows = townRows.filter((row) => row?.p1Completed === true);
      return {
        id: save.id,
        key: `cloudsave:${save.id}`,
        label: `${save.saveName} ${progressLabel}`,
        meta: `${save.playerName || "Pastor"} • ${suggestedTownName}`,
        suggestedTownId: save?.suggestedTownId || null,
        isActive: save?.isActive === true,
        details: {
          saveName: save?.saveName || "Save",
          playerName: save?.playerName || "Pastor",
          completedTowns: completed,
          totalTowns: total,
          totalCongregationBest: Number.isFinite(save?.totalCongregationBest) ? save.totalCongregationBest : 0,
          totalReplayCompletions: Number.isFinite(save?.totalReplayCompletions) ? save.totalReplayCompletions : completedTownRows.length,
          totalUpgradeLevels: Number.isFinite(save?.totalUpgradeLevels) ? save.totalUpgradeLevels : 0,
          townRows: townRows,
        },
      };
    });
    if (!titleCloudSelectedSaveId || !titleCloudSaveRows.some((row) => row.id === titleCloudSelectedSaveId)) {
      titleCloudSelectedSaveId = titleCloudActiveSaveId || titleCloudSaveRows[0]?.id || null;
    }
    titleCloudSaveLoading = false;
  } catch (e) {
    titleCloudSaveLoading = false;
    titleCloudSaveRows = [];
    titleCloudSelectedSaveId = null;
  }
}

const PAUSE_BODY =
  uiTexts.pauseBody ||
  [
    "Game paused. Take a breather, then press Continue or Space to resume.",
    "Your congregation will hold its place while you choose to keep fighting.",
  ].join(" ");

const PAUSE_HOTKEYS_HTML = `
  <div class="pause-hotkeys pause-hotkeys--single">
    <div class="pause-hotkeys__title">Controls</div>
    <ul class="pause-hotkeys__list pause-hotkeys__list--compact">
      <li>Joystick/WASD: Move</li>
      <li>Arc or Arrow keys: Aim</li>
      <li>A/Left Arrow: Melee (hold to charge)</li>
      <li>B/Up Arrow: Dash</li>
      <li>C/Right Arrow: Tap volley, hold Prayer Bomb</li>
      <li>Mouse: Aim</li>
      <li>Space: Pause / Resume</li>
    </ul>
  </div>
  <div class="pause-hotkeys__note">Press Continue or Space to resume.</div>
`;

const GAME_OVER_BODY =
  uiTexts.gameOverBody ||
  "You have no strength to continue the battle.\nThe church and the town are lost to darkness.";


function resumeFromPause() {
  pauseDialogActive = false;
  pauseRestartConfirmActive = false;
  paused = false;
  gameStarted = true;
  keysJustPressed.clear();
  window.isPauseOverlayActive = false;
  if (window.DialogOverlay && window.DialogOverlay.isVisible()) {
    window.DialogOverlay.hide();
  }
  if (typeof window !== "undefined" && typeof window.resumeBattleMusicIfNeeded === "function") {
    window.resumeBattleMusicIfNeeded();
  }
}

function showPauseDialog() {
  if (!window.DialogOverlay || pauseDialogActive) return;
  pauseDialogActive = true;
  window.isPauseOverlayActive = true;
  if (typeof window !== "undefined" && typeof window.pauseAllMusic === "function") {
    window.pauseAllMusic();
  }
  window.DialogOverlay.show({
    title: "Paused",
    bodyHtml: PAUSE_HOTKEYS_HTML,
    buttonText: "Continue",
    variant: "pause",
    devLabel: "",
    onContinue: () => {
      resumeFromPause();
    },
  });
}

function showGameOverDialog() {
  if (!window.DialogOverlay || window.gameOverDialogShown) return;
  window.gameOverDialogShown = true;
  window.gameOverDialogActive = true;
    window.DialogOverlay.show({
      title: "Game Over",
      body: GAME_OVER_BODY,
      buttonText: "Restart (Space)",
      variant: "gameover",
      devLabel: "",
      onContinue: () => {
      window.gameOverDialogActive = false;
      window.gameOverDialogShown = false;
      restartGame();
    },
  });
}

let pendingUpgradeAfterSummary = false;
let pendingPastorPostRecapAfterUpgrade = false;
let epilogueActive = false;
let epilogueTitle = "Epilogue";
let epilogueText = "";
let epilogueBackgroundKey = "epilogue";

// Scrolling epilogue/credits system
const epilogueScroll = {
  phase: "epilogue", // "epilogue" | "credits" | "done"
  scrollY: 0,
  scrollSpeed: 40, // pixels per second
  startDelay: 1.5, // seconds before scrolling starts
  delayTimer: 0,
  contentHeight: 0,
  canvasHeight: 0,
  creditsStartY: 0,
  thankYouY: 0, // Y position of "Thank you for playing!" item
  showButton: false,
  paused: false,
};

// Town Victory scene (mini-epilogue after completing a town)
let townVictoryActive = false;
let townVictoryTownName = "";
let townVictoryScore = 0;
const townVictoryScroll = {
  scrollY: 0,
  scrollSpeed: 35, // pixels per second (slightly slower than epilogue)
  startDelay: 1.0, // seconds before scrolling starts
  delayTimer: 0,
  contentHeight: 0,
  showButton: false,
};

function activateTownVictory(townName, score) {
  townVictoryTownName = townName || "this town";
  townVictoryScore = Number.isFinite(score) ? score : 0;
  townVictoryScroll.scrollY = 0;
  townVictoryScroll.delayTimer = 0;
  townVictoryScroll.contentHeight = 0;
  townVictoryScroll.showButton = false;
  townVictoryActive = true;
  // Continue recap music - don't change music
}

const CREDITS_CONTENT = [
  { type: "heading", text: "Credits" },
  { type: "spacer", height: 40 },
  { type: "label", text: "Created by" },
  { type: "name", text: "Conrad Tolosa" },
  { type: "spacer", height: 60 },
  { type: "label", text: "Art" },
  { type: "credit", text: "Pixel Art Pack by [Asset Creator]" },
  { type: "credit", text: "Additional sprites and backgrounds" },
  { type: "spacer", height: 60 },
  { type: "label", text: "Music & Sound" },
  { type: "credit", text: "Music from licensed packs" },
  { type: "credit", text: "Sound effects from various sources" },
  { type: "spacer", height: 60 },
  { type: "label", text: "Special Thanks" },
  { type: "credit", text: "Playtesters and supporters" },
  { type: "spacer", height: 100 },
  { type: "thankyou", text: "Thank you for playing!" },
  { type: "spacer", height: 200 },
];
const speedrunTimer = {
  visible: true,
  running: false,
  startTime: null,
  sectionStart: null,
  currentSection: null,
  totalElapsed: 0,
  sectionElapsed: 0,
  splits: [],
};

function getSpeedrunSectionName(levelStatus) {
  const stage = levelStatus?.stage;
  if (
    pendingTownIntroStart ||
    townIntroTransitionActive ||
    levelAnnouncements[0]?.townIntro ||
    stage === "briefing" ||
    stage === "levelIntro"
  ) {
    return "Intro";
  }
  return levelStatus?.month || "Unknown";
}

function startSpeedrunTimer() {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  speedrunTimer.running = true;
  speedrunTimer.startTime = now;
  speedrunTimer.sectionStart = now;
  speedrunTimer.currentSection = "Intro";
  speedrunTimer.totalElapsed = 0;
  speedrunTimer.sectionElapsed = 0;
  speedrunTimer.splits = [];
}

function startMissionTypewriter(overlay, text, msPerChar = 18) {
  if (!overlay) return;
  const target = overlay.querySelector(".mission-brief-text") || overlay.querySelector(".dialog-overlay__body");
  if (!target) return;
  if (overlay.__missionTypeTimer) clearInterval(overlay.__missionTypeTimer);
  target.textContent = "";
  let idx = 0;
  const payload = String(text || "");
  overlay.__missionTypeTimer = setInterval(() => {
    idx += 1;
    target.textContent = payload.slice(0, idx);
    if (idx >= payload.length) {
      clearInterval(overlay.__missionTypeTimer);
      overlay.__missionTypeTimer = null;
    }
  }, msPerChar);
}

function showBattleSummaryDialog(announcement, savedCount, lostCount, upgradeAfter, portraits = {}) {
  if (announcement?.recapPrepared) return true;
  startRecapIntroFade(1.5);
  const isFinalYear = Boolean(announcement?.finalYear);
  const shouldUpgradeAfter = Boolean(upgradeAfter);
  // Track which level was just completed for chapter breaks (boss/level summary only)
  if (announcement?.levelSummary) {
    lastCompletedLevel = announcement.completedActNum
      ?? (levelManager?.getActNumber ? levelManager.getActNumber() : 1);
    lastSummaryWasLevelEnd = true;
    console.log("Mission completed, lastCompletedLevel set to:", lastCompletedLevel);
  }
  startRecapMusic();
  const summary = levelManager?.getLastBattleSummary?.() || {};
  const status = levelManager?.getStatus?.() || null;
  const savedNames = Array.isArray(summary.savedNames)
    ? summary.savedNames.filter(Boolean)
    : [];
  const lostNames = Array.isArray(summary.lostNames)
    ? summary.lostNames.filter(Boolean)
    : [];
  const formatNameList = (names) => {
    const list = Array.isArray(names) ? names.filter(Boolean) : [];
    if (!list.length) return "";
    if (list.length === 1) return list[0];
    if (list.length === 2) return `${list[0]} and ${list[1]}`;
    return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
  };
  const levelNumber = levelManager?.getLevelNumber ? levelManager.getLevelNumber() : 1;
  const currentSeasonNumber = levelNumber; // one season per level (4 months each)
  if (seasonStats.seasonNumber !== currentSeasonNumber) {
    seasonStats.seasonNumber = currentSeasonNumber;
    seasonStats.monthlyAdded = 0;
    seasonStats.lost = 0;
    seasonStats.bossBonus = 0;
    seasonStats.bossBonusApplied = false;
    seasonStats.recapShown = false;
    seasonStats.visitorAdded = 0;
    seasonStats.startCongregation = getCongregationSize();
  }
  const monthLabelFromAnnouncement = (() => {
    const titleText = String(announcement?.title || "");
    const match = titleText.match(/—\s*([^]+?)\s*Cleared/i);
    return match && match[1] ? match[1].trim() : null;
  })();
  const monthLabel =
    monthLabelFromAnnouncement ||
    (levelManager?.getStatus?.() && levelManager.getStatus().month) ||
    "This Month";
  const localMonthNumber = status?.battle || 1; // battle is 1-based month within the level
  const stage = status?.stage || "";
  const isBossSummary = Boolean(announcement?.levelSummary) || stage === "levelSummary";
  if (seasonStats.startCongregation == null) {
    seasonStats.startCongregation = getCongregationSize();
  }
  const npcHealthBreakdown = Array.isArray(summary?.npcHealthBreakdown)
    ? summary.npcHealthBreakdown
    : [];
  const totalNpcFaithRaw = Number.isFinite(summary?.totalNpcFaith) ? summary.totalNpcFaith : 0;
  const totalNpcFaith = Math.max(0, Math.min(500, Math.round(totalNpcFaithRaw)));
  const playerHealthAtRecap = Number.isFinite(player?.health) ? Math.max(0, Math.round(player.health)) : 0;
  const prayerBombComboContributions = Array.isArray(summary?.prayerBombComboContributions)
    ? summary.prayerBombComboContributions
        .map((value) => (Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0))
        .filter((value) => value > 0)
    : [];
  const prayerBombContributions = Array.isArray(summary?.prayerBombContributions)
    ? summary.prayerBombContributions
        .map((value) => (Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0))
        .filter((value) => value > 0)
    : [];
  const prayerBombTotal = prayerBombContributions.reduce((sum, value) => sum + value, 0);
  const prayerBombComboTotal = prayerBombComboContributions.reduce((sum, value) => sum + value, 0);
  const battleMaxCombo = Number.isFinite(summary?.battleMaxCombo)
    ? Math.max(0, Math.round(summary.battleMaxCombo))
    : 0;
  const zeroHealthPenaltyCount = isBossSummary
    ? 0
    : npcHealthBreakdown.reduce(
        (sum, entry) => {
          const isRealNpc = Boolean((entry?.name || "").trim() || entry?.portrait);
          if (!isRealNpc) return sum;
          const faithValue = Number.isFinite(entry?.faith) ? Math.max(0, Math.round(entry.faith)) : 0;
          return sum + (faithValue <= 0 ? 1 : 0);
        },
        0,
      );
  const healthRewardBase = isBossSummary ? 0 : Math.max(0, Math.min(5, Math.floor(totalNpcFaith / 100)));
  const healthReward = isBossSummary ? 0 : (healthRewardBase - zeroHealthPenaltyCount);
  const perfectProtectionValue = !isBossSummary && totalNpcFaith >= 500 ? 100 : 0;
  const pastorHealthValue = playerHealthAtRecap;
  const maxComboPerformanceValue = battleMaxCombo;
  const prayerBombPerformanceValue = prayerBombTotal;
  const congregationalPrayersPerformanceValue = prayerBombComboTotal;
  const performancePointTotal =
    perfectProtectionValue +
    pastorHealthValue +
    maxComboPerformanceValue +
    prayerBombPerformanceValue +
    congregationalPrayersPerformanceValue;
  const performanceCongregationReward = Math.floor(performancePointTotal / 100);
  const bossHealth = Number.isFinite(player?.health) ? player.health : 0;
  const PERFORMANCE_BONUS_BADGE_SRCS = {
    perfectCongregation: "assets/sprites/items/icons/I07_Apple.png",
    pastorHealth: "assets/sprites/items/Weapons/W14_Sword.png",
    maxCombo: "assets/sprites/items/icons/I36_Hammer.png",
    prayerBomb: "assets/sprites/items/icons/A32_Decorative_Shield.png",
    congregationalPrayers: "assets/sprites/items/icons/A29_Iron_Shield.png",
  };
  const performanceBadgeBreakdown = [];
  if (pastorHealthValue > 0) {
    performanceBadgeBreakdown.push({
      id: "pastorHealth",
      label: "Pastor Health",
      iconSrc: PERFORMANCE_BONUS_BADGE_SRCS.pastorHealth,
      value: pastorHealthValue,
    });
  }
  if (maxComboPerformanceValue > 0) {
    performanceBadgeBreakdown.push({
      id: "maxCombo",
      label: "Max Combo",
      iconSrc: PERFORMANCE_BONUS_BADGE_SRCS.maxCombo,
      value: maxComboPerformanceValue,
    });
  }
  if (perfectProtectionValue > 0) {
    performanceBadgeBreakdown.push({
      id: "perfectProtection",
      label: "Perfect Protection",
      iconSrc: PERFORMANCE_BONUS_BADGE_SRCS.perfectCongregation,
      value: perfectProtectionValue,
    });
  }
  if (prayerBombPerformanceValue > 0) {
    performanceBadgeBreakdown.push({
      id: "prayerBomb",
      label: "Prayer Bomb",
      iconSrc: PERFORMANCE_BONUS_BADGE_SRCS.prayerBomb,
      value: prayerBombPerformanceValue,
    });
  }
  if (congregationalPrayersPerformanceValue > 0) {
    performanceBadgeBreakdown.push({
      id: "congregationalPrayers",
      label: "Congregational Prayers",
      iconSrc: PERFORMANCE_BONUS_BADGE_SRCS.congregationalPrayers,
      value: congregationalPrayersPerformanceValue,
    });
  }
  if (!summary.congregationDeltaApplied) {
    adjustCongregationSize(healthReward + performanceCongregationReward);
    summary.congregationDeltaApplied = true;
    summary.healthReward = healthReward;
    summary.performanceBonusReward = performanceCongregationReward;
  }
  seasonStats.monthlyAdded += healthReward + performanceCongregationReward;
  seasonStats.lost += Math.max(0, lostCount || 0);
  const congregationTotal = getCongregationSize();
  const formatDelta = (value) => {
    const numeric = Number.isFinite(value) ? Math.round(value) : 0;
    const sign = numeric >= 0 ? "+" : "-";
    return `${sign}${formatNumberWithCommas(Math.abs(numeric))}`;
  };
  const totalDelta = healthReward + performanceCongregationReward;
  const graceBonusCongregants = Math.max(0, totalDelta);
  const graceBonus = 0;
  if (graceBonus > 0 && !summary.graceBonusApplied) {
    summary.graceBonusApplied = false;
    summary.graceBonus = graceBonus;
  }
  const recapLines = [];
  const scenario =
    summary?.battleScenario ||
    status?.battleScenario ||
    (typeof window !== "undefined" ? window.__lastMissionBriefScenario : null) ||
    announcement?.missionBriefScenario ||
    "a crisis";
  const scenarioTitle =
    typeof scenario === "string"
      ? scenario
      : scenario && typeof scenario === "object" && typeof scenario.title === "string"
        ? scenario.title
        : "a crisis";
  const scenarioRecap =
    scenario && typeof scenario === "object" && typeof scenario.recap === "string"
      ? scenario.recap
      : null;
  if (!isBossSummary) {
    recapLines.push({
      label: "Congregation Health Bonus:",
      delta: healthReward,
      kind: "npcHealthBonus",
      affectsTotal: true,
      totalHealth: totalNpcFaith,
      positiveHealthBonus: healthRewardBase,
      zeroHealthPenaltyCount,
      npcHealthBreakdown,
    });
  }
  if (performanceBadgeBreakdown.length > 0) {
    recapLines.push({
      label: "Performance Bonuses:",
      delta: performanceCongregationReward,
      kind: "performanceBonuses",
      affectsTotal: true,
      totalPerformance: performancePointTotal,
      performanceCongregationReward,
      performanceBadgeBreakdown,
    });
  }
  const recapTitle = "Battle Report";
  const recapStartCount = Number.isFinite(summary?.battleStartCongregation)
    ? Math.round(summary.battleStartCongregation)
    : Math.round(congregationTotal - totalDelta);
  if (announcement) {
    announcement.recapData = {
      id: `${announcement.title || monthLabel || "recap"}|${levelNumber}|${localMonthNumber}`,
      title: recapTitle,
      startCount: recapStartCount,
      totalDelta,
      totalCount: congregationTotal,
      problemTitle: isBossSummary ? "" : scenarioTitle,
      lines: recapLines,
      graceBonus,
      graceBonusCongregants,
      graceApplied: false,
      graceAppliedCount: 0,
      graceSpawned: false,
    };
  }
  let paragraph = "";
  if (isBossSummary) {
    paragraph = `Pastor's Health: ${formatNumberWithCommas(bossHealth)}. Performance total: ${formatNumberWithCommas(performancePointTotal)} (${formatDelta(performanceCongregationReward)} congregants). Current Congregation Size: (${formatDelta(totalDelta)}) ${formatNumberWithCommas(congregationTotal)}`;
  } else {
    if (savedNames.length) {
      const names = savedNames.join(", ");
      paragraph += `You ministered to ${names}. `;
    }
    if (lostNames.length) {
      const names = lostNames.join(", ");
      const verb = lostNames.length === 1 ? "has" : "have";
      paragraph += `${names} ${verb} left the church. `;
    }
    const zeroPenaltyLabel = zeroHealthPenaltyCount === 1 ? "zero-health penalty" : "zero-health penalties";
    paragraph += `Their remaining health was ${formatNumberWithCommas(totalNpcFaith)} (${formatDelta(healthRewardBase)}), with ${formatNumberWithCommas(zeroHealthPenaltyCount)} ${zeroPenaltyLabel} (${formatDelta(-zeroHealthPenaltyCount)}). Current Congregation Size: (${formatDelta(totalDelta)}) ${formatNumberWithCommas(congregationTotal)}`;
  }
  const body = paragraph;
  if (announcement) {
    announcement.recapTitle = recapTitle;
    announcement.recapBody = body;
    announcement.recapFinalYear = isFinalYear;
    announcement.recapUpgradeAfter = shouldUpgradeAfter;
    announcement.recapPrepared = true;
  }
  return true;
}

function createFloorPattern() {
  const tileSize = 48;
  const patternCanvas = document.createElement("canvas");
  patternCanvas.width = tileSize;
  patternCanvas.height = tileSize;
  const patternCtx = patternCanvas.getContext("2d");

  patternCtx.fillStyle = "#1a1d26";
  patternCtx.fillRect(0, 0, tileSize, tileSize);

  patternCtx.fillStyle = "#1f222b";
  patternCtx.fillRect(0, 0, tileSize / 2, tileSize / 2);
  patternCtx.fillRect(tileSize / 2, tileSize / 2, tileSize / 2, tileSize / 2);

  patternCtx.fillStyle = "#232632";
  patternCtx.fillRect(0, tileSize / 2 - 4, tileSize, 8);
  patternCtx.fillRect(tileSize / 2 - 4, 0, 8, tileSize);

  return ctx.createPattern(patternCanvas, "repeat");
}

const floorPattern = createFloorPattern();

function spawnSinglePowerUpDrop() {
  const stageName = levelManager?.getStatus?.().stage;
  if (stageName === "levelIntro" || stageName === "briefing" || stageName === "npcArrival") {
    return false;
  }
  const isBossStage = stageName === "bossIntro" || stageName === "bossActive";
  const weaponPickupEntries = Object.entries(assets?.weaponPickups || {}).filter(([, def]) =>
    isBossStage ? !isNpcWeaponPowerup(def) : true,
  );
  const hasWeaponPickups = weaponPickupEntries.length > 0;
  const hasChurchPowerupPickups = getUnlockedChurchPowerupKeys().length > 0;
  const hasUtility = Object.keys(assets?.utility || {}).length > 0;
  if (!hasWeaponPickups && !hasUtility && !hasChurchPowerupPickups) return false;
  if (hasChurchPowerupPickups && Math.random() < 0.2) {
    if (canSpawnChurchPowerup()) {
      return Boolean(spawnChurchPowerupPickup());
    }
  }
  const spawnUtility = hasUtility && Math.random() < 0.45;
  if (spawnUtility) {
    if (canSpawnUtilityPowerUp()) {
      return Boolean(spawnUtilityPowerUp());
    }
    return false;
  }
  if (!hasWeaponPickups) {
    if (canSpawnUtilityPowerUp()) {
      return Boolean(spawnUtilityPowerUp());
    }
    return false;
  }
  if (!canSpawnWeaponPowerUp()) {
    if (canSpawnUtilityPowerUp()) {
      return Boolean(spawnUtilityPowerUp());
    }
    return false;
  }
  const [type, def] = weaponPickupEntries[Math.floor(Math.random() * weaponPickupEntries.length)];
  if (isWeaponPowerEffect(def?.effect) && !canSpawnWeaponPowerUp()) {
    if (canSpawnUtilityPowerUp()) {
      return Boolean(spawnUtilityPowerUp());
    }
    return false;
  }
  const pickup = new WeaponPickup({ ...def, type });
  const padding = 120;
  pickup.x = Math.random() * (canvas.width - padding * 2) + padding;
  pickup.y = Math.random() * (canvas.height - padding * 2) + padding;
  const pushed = pushPointOutsideNpcHome(pickup.x, pickup.y);
  pickup.x = Math.max(padding, Math.min(canvas.width - padding, pushed.x));
  pickup.y = Math.max(padding, Math.min(canvas.height - padding, pushed.y));
  pickup.baseY = pickup.y;
  weaponPickups.push(pickup);
  return true;
}

function queuePowerUpDrops(count = 1) {
  const stageName = typeof levelManager?.getStatus === "function" ? levelManager.getStatus()?.stage : "";
  if (stageName === "victoryCelebrate") return;
  queuedPowerUpDrops += Math.max(0, Math.floor(count));
}

function processQueuedPowerUpDrops() {
  const stageName = typeof levelManager?.getStatus === "function" ? levelManager.getStatus()?.stage : "";
  if (stageName === "victoryCelebrate") {
    queuedPowerUpDrops = 0;
    powerUpStaggerTimer = 0;
    return false;
  }
  if (queuedPowerUpDrops <= 0 || powerUpStaggerTimer > 0) return false;
  const spawned = spawnSinglePowerUpDrop();
  if (!spawned) return false;
  queuedPowerUpDrops = Math.max(0, queuedPowerUpDrops - 1);
  powerUpStaggerTimer = POWERUP_STAGGER_DELAY;
  return spawned;
}

function spawnPowerUpDrops(count = 1) {
  const stageName = typeof levelManager?.getStatus === "function" ? levelManager.getStatus()?.stage : "";
  if (stageName === "victoryCelebrate") return false;
  queuePowerUpDrops(count);
  return processQueuedPowerUpDrops();
}

const EARLY_BOSS_TYPE_POOL = ["bossHighDemon"];
const FINAL_TOWN_BOSS_TYPE = "bossDemonLord";
const BOSS_TYPE_POOL = [...EARLY_BOSS_TYPE_POOL, FINAL_TOWN_BOSS_TYPE];

function logBossSpriteIssue(payload) {
  try {
    const enriched = Object.assign(
      {
        timestamp: Date.now(),
        availableBossSprites: Object.keys((assets && assets.enemies) || {}).filter((key) =>
          BOSS_TYPE_POOL.includes(key),
        ),
      },
      payload || {},
    );
    window.__BATTLECHURCH_LAST_BOSS_ERROR = enriched;
    console.warn("Boss sprite issue detected", enriched);
  } catch (err) {
    console.warn("Boss sprite issue detected (logging failed)", payload, err);
  }
}

function resolveBossClips(type) {
  const enemyClips = assets?.enemies || null;
  if (!enemyClips) {
    logBossSpriteIssue({ reason: "assets-unloaded", requestedType: type });
    return null;
  }
  if (enemyClips[type]) {
    return { key: type, clips: enemyClips[type], fallback: false };
  }
  const fallbackType = BOSS_TYPE_POOL.find((candidate) => enemyClips[candidate]);
  if (fallbackType) {
    logBossSpriteIssue({ reason: "missing-requested-clips", requestedType: type, fallbackType });
    return { key: fallbackType, clips: enemyClips[fallbackType], fallback: true };
  }
  const genericKey = Object.keys(enemyClips).find((key) => enemyClips[key]);
  if (genericKey) {
    logBossSpriteIssue({
      reason: "no-boss-sprites-loaded",
      requestedType: type,
      fallbackType: genericKey,
      genericFallback: true,
    });
    return { key: genericKey, clips: enemyClips[genericKey], fallback: true };
  }
  logBossSpriteIssue({ reason: "no-enemy-sprites-loaded", requestedType: type });
  return null;
}

function chooseBossType(levelNumber) {
  const townBossCount =
    typeof window !== "undefined" && Number.isFinite(window.BATTLES_PER_TOWN)
      ? window.BATTLES_PER_TOWN
      : 3;
  if (levelNumber >= townBossCount) {
    return FINAL_TOWN_BOSS_TYPE;
  }
  if (!EARLY_BOSS_TYPE_POOL.length) return FINAL_TOWN_BOSS_TYPE;
  const index = (levelNumber - 1) % EARLY_BOSS_TYPE_POOL.length;
  return EARLY_BOSS_TYPE_POOL[index];
}

function spawnBossForLevel(levelNumber) {
  const fallbackType = FINAL_TOWN_BOSS_TYPE;
  const attempted = new Set();
  const trySpawn = (type) => {
    if (!type) return null;
    const boss = new BossEncounter({ level: levelNumber, type });
    if (boss && !boss.invalid) return boss;
    logBossSpriteIssue({ reason: "boss-constructor-invalid", requestedType: type });
    return null;
  };

  let bossType = chooseBossType(levelNumber);
  let boss = trySpawn(bossType);
  attempted.add(bossType);

  if (!boss) {
    for (const candidate of BOSS_TYPE_POOL) {
      if (attempted.has(candidate)) continue;
      boss = trySpawn(candidate);
      attempted.add(candidate);
      if (boss) break;
    }
  }

  if (!boss && !attempted.has(fallbackType)) {
    boss = trySpawn(fallbackType);
  }

  if (!boss) return null;
  activeBoss = boss;
  levelManager?.attachBoss(boss);
  if (player) {
    const leftMargin = Math.max(player.radius + 36, canvas.width * 0.08);
    const playfieldCenterY = HUD_HEIGHT + (canvas.height - HUD_HEIGHT) / 2;
    const maxY = canvas.height - player.radius - 20;
    player.x = leftMargin;
    player.y = Math.max(HUD_HEIGHT + player.radius + 20, Math.min(maxY, playfieldCenterY));
    clampEntityToBounds(player);
  }
  const status = levelManager?.getStatus ? levelManager.getStatus() : null;
  const theme = status?.bossTheme || "Boss battle";
  setDevStatus(`${theme} (Phase 1)`, 3.5);
  return boss;
}

function eliminateActiveEnemiesForBossVictory() {
  enemies.forEach((enemy) => {
    if (!enemy || enemy.dead || enemy.state === "death") return;
    if (typeof enemy.takeDamage === "function") {
      const health = Number.isFinite(enemy.health) ? enemy.health : enemy.config?.health || 10;
      enemy.takeDamage(health + 1000);
    } else {
      enemy.dead = true;
      enemy.state = "death";
    }
  });
  bossHazards.forEach((hazard) => {
    if (hazard) {
      hazard.dead = true;
      hazard.life = 0;
    }
  });
}

function rebuildObstacles() {
  if (!assets?.obstacles) return;
  obstacles.splice(0, obstacles.length);
  OBSTACLE_LAYOUT.forEach(({ key, xRatio, yRatio }) => {
    const asset = assets.obstacles[key];
    if (!asset) return;
    const obstacle = new Obstacle(asset, xRatio, yRatio);
    obstacles.push(obstacle);
  });
  positionObstacles();
}

function positionObstacles() {
  obstacles.forEach((obstacle) => obstacle.updatePosition());
}

function spawnWeaponDrops(minCount = 1) {
  if (!canSpawnWeaponPowerUp()) return;
  const stageName = levelManager?.getStatus?.().stage;
  const isBossStage = stageName === "bossIntro" || stageName === "bossActive";
  const entries = Object.entries(assets.weaponPickups || {}).filter(([, def]) =>
    isBossStage ? !isNpcWeaponPowerup(def) : true,
  );
  if (!entries.length) return;
  while (weaponPickups.length < minCount && canSpawnWeaponPowerUp()) {
    const [type, def] = entries[Math.floor(Math.random() * entries.length)];
    weaponPickups.push(new WeaponPickup({ ...def, type }));
  }
}

function isWeaponPowerEffect(effect) {
  return WEAPON_POWERUP_EFFECTS.has(effect);
}

function isNpcWeaponPowerup(def) {
  const effect = typeof def?.effect === "string" ? def.effect : "";
  return effect.startsWith("npc");
}

function getUnlockedChurchPowerupKeys() {
  return Array.from(unlockedChurchPowerups).filter((key) => assets?.churchPowerups?.[key]);
}

function getBossSpawnBlockZone() {
  const boss = levelManager?.getBoss?.();
  if (!boss || boss.dead || boss.defeated || boss.removed) return null;
  const hitbox = boss.hitbox || boss.config?.hitbox || null;
  const hasHitbox =
    hitbox &&
    Number.isFinite(hitbox.width) && hitbox.width > 0 &&
    Number.isFinite(hitbox.height) && hitbox.height > 0;
  const cx = boss.x + (hasHitbox && Number.isFinite(hitbox.offsetX) ? hitbox.offsetX : 0);
  const cy = boss.y + (hasHitbox && Number.isFinite(hitbox.offsetY) ? hitbox.offsetY : 0);
  const radius = (hasHitbox ? Math.hypot(hitbox.width, hitbox.height) / 2 : (boss.radius || 80)) + 50;
  return { x: cx, y: cy, radius };
}

function spawnChurchPowerupPickup(type = null, position = null) {
  if (!canSpawnChurchPowerup()) return null;
  if (!assets?.churchPowerups) return null;
  const keys = type ? [type] : getUnlockedChurchPowerupKeys();
  if (!keys.length) return null;
  const selected = keys[Math.floor(Math.random() * keys.length)];
  const def = assets.churchPowerups[selected];
  if (!def?.image) return null;
  const areaPadding = 120;
  const minX = areaPadding;
  const maxX = Math.max(minX, canvas.width - areaPadding);
  const minY = Math.max(HUD_HEIGHT + POWERUP_PLAYFIELD_MARGIN, areaPadding);
  const maxY = Math.max(minY, canvas.height - areaPadding);
  const homeBounds = getNpcHomeBounds();
  const bossZone = getBossSpawnBlockZone();

  const isInsideHome = (x, y) => {
    const dx = x - homeBounds.x;
    const dy = y - homeBounds.y;
    return Math.hypot(dx, dy) <= homeBounds.radius;
  };
  const isInsideBoss = (x, y) => {
    if (!bossZone) return false;
    return Math.hypot(x - bossZone.x, y - bossZone.y) <= bossZone.radius;
  };
  const pushOutOf = (x, y, zone, margin = 28) => {
    const angle = Math.atan2(y - zone.y, x - zone.x);
    return {
      x: Math.max(minX, Math.min(maxX, zone.x + Math.cos(angle) * (zone.radius + margin))),
      y: Math.max(minY, Math.min(maxY, zone.y + Math.sin(angle) * (zone.radius + margin))),
    };
  };

  const spanX = Math.max(0, maxX - minX);
  const spanY = Math.max(0, maxY - minY);

  let spawnX;
  let spawnY;

  if (position?.x !== undefined || position?.y !== undefined) {
    spawnX = Math.max(minX, Math.min(maxX, position?.x ?? minX));
    spawnY = Math.max(minY, Math.min(maxY, position?.y ?? minY));
    if (isInsideHome(spawnX, spawnY)) {
      ({ x: spawnX, y: spawnY } = pushOutOf(spawnX, spawnY, homeBounds));
    }
    if (isInsideBoss(spawnX, spawnY)) {
      ({ x: spawnX, y: spawnY } = pushOutOf(spawnX, spawnY, bossZone));
    }
  } else {
    let attempts = 0;
    do {
      spawnX = minX + (spanX > 0 ? Math.random() * spanX : 0);
      spawnY = minY + (spanY > 0 ? Math.random() * spanY : 0);
      attempts += 1;
    } while ((isInsideHome(spawnX, spawnY) || isInsideBoss(spawnX, spawnY)) && attempts < 50);
    if (isInsideHome(spawnX, spawnY)) {
      ({ x: spawnX, y: spawnY } = pushOutOf(spawnX, spawnY, homeBounds));
    }
    if (isInsideBoss(spawnX, spawnY)) {
      ({ x: spawnX, y: spawnY } = pushOutOf(spawnX, spawnY, bossZone));
    }
  }

  const pickup = new WeaponPickup({ ...def, type: selected });
  pickup.x = spawnX;
  pickup.y = spawnY;
  pickup.baseY = pickup.y;
  clampEntityToBounds(pickup);
  churchPowerupPickups.push(pickup);
  return pickup;
}

function spawnUtilityPowerUp(type = null, position = null) {
  if (!canSpawnUtilityPowerUp()) return null;
  if (!assets?.utility) return null;
  const keys = type ? [type] : Object.keys(UTILITY_POWERUP_DEFS);
  if (!keys.length) return null;
  const selected = keys[Math.floor(Math.random() * keys.length)];
  const asset = assets.utility[selected];
  if (!asset?.image) return null;
  const areaPadding = 120;
  const minX = areaPadding;
  const maxX = Math.max(minX, canvas.width - areaPadding);
  const minY = Math.max(HUD_HEIGHT + POWERUP_PLAYFIELD_MARGIN, areaPadding);
  const maxY = Math.max(minY, canvas.height - areaPadding);
  const homeBounds = getNpcHomeBounds();
  const bossZone = getBossSpawnBlockZone();

  const isInsideHome = (x, y) => {
    const dx = x - homeBounds.x;
    const dy = y - homeBounds.y;
    return Math.hypot(dx, dy) <= homeBounds.radius;
  };
  const isInsideBoss = (x, y) => {
    if (!bossZone) return false;
    return Math.hypot(x - bossZone.x, y - bossZone.y) <= bossZone.radius;
  };
  const pushOutOf = (x, y, zone, margin = 28) => {
    const angle = Math.atan2(y - zone.y, x - zone.x);
    return {
      x: Math.max(minX, Math.min(maxX, zone.x + Math.cos(angle) * (zone.radius + margin))),
      y: Math.max(minY, Math.min(maxY, zone.y + Math.sin(angle) * (zone.radius + margin))),
    };
  };

  const spanX = Math.max(0, maxX - minX);
  const spanY = Math.max(0, maxY - minY);

  let spawnX;
  let spawnY;

  if (position?.x !== undefined || position?.y !== undefined) {
    spawnX = Math.max(minX, Math.min(maxX, position?.x ?? minX));
    spawnY = Math.max(minY, Math.min(maxY, position?.y ?? minY));
    if (isInsideHome(spawnX, spawnY)) {
      ({ x: spawnX, y: spawnY } = pushOutOf(spawnX, spawnY, homeBounds));
    }
    if (isInsideBoss(spawnX, spawnY)) {
      ({ x: spawnX, y: spawnY } = pushOutOf(spawnX, spawnY, bossZone));
    }
  } else {
    let attempts = 0;
    do {
      spawnX = minX + (spanX > 0 ? Math.random() * spanX : 0);
      spawnY = minY + (spanY > 0 ? Math.random() * spanY : 0);
      attempts += 1;
    } while ((isInsideHome(spawnX, spawnY) || isInsideBoss(spawnX, spawnY)) && attempts < 50);
    if (isInsideHome(spawnX, spawnY)) {
      ({ x: spawnX, y: spawnY } = pushOutOf(spawnX, spawnY, homeBounds));
    }
    if (isInsideBoss(spawnX, spawnY)) {
      ({ x: spawnX, y: spawnY } = pushOutOf(spawnX, spawnY, bossZone));
    }
  }

  const definition = { ...asset, type: selected };
  const powerUp = new UtilityPowerUp(definition, spawnX, spawnY);
  utilityPowerUps.push(powerUp);
  return powerUp;
}

function spawnWeaponPickup(position = null) {
  if (!assets?.weaponPickups) return null;
  const stageName = levelManager?.getStatus?.().stage;
  const isBossStage = stageName === "bossIntro" || stageName === "bossActive";
  const entries = Object.entries(assets.weaponPickups).filter(([, def]) =>
    isWeaponPowerEffect(def?.effect) && (!isBossStage || !isNpcWeaponPowerup(def)),
  );
  if (!entries.length || !canSpawnWeaponPowerUp()) return null;
  const [type, def] = entries[Math.floor(Math.random() * entries.length)];
  const pickup = new WeaponPickup({ ...def, type });
  if (position?.x !== undefined) pickup.x = position.x;
  if (position?.y !== undefined) pickup.y = position.y;
  const pushed = pushPointOutsideNpcHome(pickup.x, pickup.y);
  pickup.x = pushed.x;
  pickup.y = pushed.y;
  const bossZoneW = getBossSpawnBlockZone();
  if (bossZoneW && Math.hypot(pickup.x - bossZoneW.x, pickup.y - bossZoneW.y) <= bossZoneW.radius) {
    const angle = Math.atan2(pickup.y - bossZoneW.y, pickup.x - bossZoneW.x);
    pickup.x = bossZoneW.x + Math.cos(angle) * (bossZoneW.radius + 28);
    pickup.y = bossZoneW.y + Math.sin(angle) * (bossZoneW.radius + 28);
  }
  pickup.baseY = pickup.y;
  clampEntityToBounds(pickup);
  weaponPickups.push(pickup);
  return pickup;
}

function spawnNextEnsuredPowerUp() {
  const ensureActions = [
    () => (canSpawnUtilityPowerUp() ? spawnUtilityPowerUp() : null),
    () => (canSpawnWeaponPowerUp() ? spawnWeaponPickup() : null),
  ];
  const startIndex = powerUpEnsureCycleIndex % ensureActions.length;
  for (let i = 0; i < ensureActions.length; i += 1) {
    const index = (startIndex + i) % ensureActions.length;
    const spawned = ensureActions[index]?.();
    powerUpEnsureCycleIndex = index + 1;
    if (spawned) {
      powerUpStaggerTimer = POWERUP_STAGGER_DELAY;
      return true;
    }
  }
  return false;
}

function devSwapPowerups() {
  if (!assets) return false;
  const stageName = levelManager?.getStatus?.().stage;
  const isBossStage = stageName === "bossIntro" || stageName === "bossActive";
  const weaponDefs = Object.entries(assets.weaponPickups || {}).filter(([, def]) =>
    isWeaponPowerEffect(def?.effect) && (!isBossStage || !isNpcWeaponPowerup(def)),
  );
  const utilityDefs = Object.entries(assets.utility || {});
  if (!weaponDefs.length && !utilityDefs.length) return false;
  devPowerupSwapIndex += 1;
  if (weaponDefs.length) {
    for (let i = 0; i < weaponPickups.length; i += 1) {
      const [type, def] = weaponDefs[(devPowerupSwapIndex + i) % weaponDefs.length];
      const next = new WeaponPickup({ ...def, type });
      next.x = weaponPickups[i].x;
      next.y = weaponPickups[i].y;
      next.baseY = next.y;
      clampEntityToBounds(next);
      weaponPickups[i] = next;
    }
  }
  if (utilityDefs.length) {
    for (let i = 0; i < utilityPowerUps.length; i += 1) {
      const [type, def] = utilityDefs[(devPowerupSwapIndex + i) % utilityDefs.length];
      const next = new UtilityPowerUp({ ...def, type }, utilityPowerUps[i].x, utilityPowerUps[i].y);
      next.baseY = next.y;
      clampEntityToBounds(next);
      utilityPowerUps[i] = next;
    }
  }
  return true;
}

function showWeaponPowerupFloatingText(text, color = "#fff") {
  return;
}

function applyWeaponPickupEffect(pickup) {
  if (!player) return;
  const def = pickup.definition;
  if (typeof window !== "undefined" && typeof window.playWeaponPowerupPickupSfx === "function") {
    window.playWeaponPowerupPickupSfx(0.55);
  }
  switch (pickup.effect) {
    case "heal": {
      const healAmount =
        typeof def.healAmount === "number" ? def.healAmount : Math.round(HERO_HEALTH_PER_HEART);
      player.health = Math.min(player.maxHealth, player.health + healAmount);
      addStatusText(player, "Health Up!", {
        color: "#5FE3C0",
        bgColor: "rgba(30, 70, 50, 0.85)",
        life: 1.8,
      });
      break;
    }
    case "arrowBuff": {
      const config = resolveWeaponPowerupConfig("arrowBuff", def);
      player.arrowBuffTimer = config.duration;
      player.arrowDamageMultiplier = config.damageMultiplier;
      addStatusText(player, config.text, {
        color: config.textColor,
        bgColor: config.statusBgColor,
        life: config.statusLife,
      });
      spawnPowerupHudFlyEffect({
        x: pickup.x,
        y: pickup.y,
        iconImage: def?.iconImage || null,
        targetKey: getPowerupHudTargetKey(pickup.effect),
      });
      break;
    }
    case "wisdomWeapon": {
      const config = resolveWeaponPowerupConfig("wisdomWeapon", def);
      player.weaponMode = "wisdom_missle";
      player.weaponPowerTimer = config.duration;
      player.weaponPowerDuration = config.duration;
      player.wisdomMissleShotsMax = config.maxShots;
      player.magicCooldownMultiplier = config.cooldownMultiplier;
      player.magicSpeedMultiplier = config.speedMultiplier;
      player.magicBuffTimer = config.duration;
      player.magicCooldown = 0;
      showWeaponPowerupConfigText(config);
      spawnPowerupHudFlyEffect({
        x: pickup.x,
        y: pickup.y,
        iconImage: def?.iconImage || null,
        targetKey: getPowerupHudTargetKey(pickup.effect),
      });
      break;
    }
    case "cannonWeapon": {
      const config = resolveWeaponPowerupConfig("cannonWeapon", def);
      player.weaponMode = "faith_cannon";
      player.weaponPowerTimer = config.duration;
      player.weaponPowerDuration = config.duration;
      player.faithCannonShotsMax = config.maxShots;
      player.faithCannonCooldownMultiplier = config.cooldownMultiplier;
      player.faithCannonSpeedMultiplier = config.speedMultiplier;
      player.faithCannonDamageMultiplier = config.damageMultiplier;
      player.magicCooldown = 0;
      showWeaponPowerupConfigText(config);
      spawnPowerupHudFlyEffect({
        x: pickup.x,
        y: pickup.y,
        iconImage: def?.iconImage || null,
        targetKey: getPowerupHudTargetKey(pickup.effect),
      });
      break;
    }
    case "scriptureWeapon": {
      const config = resolveWeaponPowerupConfig("scriptureWeapon", def);
      player.weaponMode = "fire";
      player.weaponPowerTimer = config.duration;
      player.weaponPowerDuration = config.duration;
      player.fireShotsMax = config.maxShots;
      player.fireCooldownMultiplier = config.cooldownMultiplier;
      player.fireSpeedMultiplier = config.speedMultiplier;
      player.fireDamageMultiplier = config.damageMultiplier;
      player.magicCooldown = 0;
      showWeaponPowerupConfigText(config);
      spawnPowerupHudFlyEffect({
        x: pickup.x,
        y: pickup.y,
        iconImage: def?.iconImage || null,
        targetKey: getPowerupHudTargetKey(pickup.effect),
      });
      break;
    }
    case "spreadGun": {
      const config = resolveWeaponPowerupConfig("spreadGun", def);
      const sgLevel = Math.min(CHURCH_POWERUP_MAX_LEVEL, churchPowerupLevels.get("spreadGun") || 1);
      const sgDuration = getChurchPowerupInstanceDuration(config.duration, sgLevel, 1);
      if (player.spreadGunTimer > 0) {
        player.spreadGunBonusTimer = Math.max(player.spreadGunBonusTimer || 0, sgDuration);
      }
      player.spreadGunTimer = Math.max(player.spreadGunTimer, sgDuration);
      player.spreadGunDuration = Math.max(player.spreadGunDuration, sgDuration);
      player.spreadGunMaxDuration = config.duration;
      player.spreadGunLevel = Math.max(player.spreadGunLevel || 0, sgLevel);
      showWeaponPowerupConfigText(config);
      break;
    }
    case "halo": {
      const config = resolveWeaponPowerupConfig("halo", def);
      const haloLevel = Math.min(CHURCH_POWERUP_MAX_LEVEL, churchPowerupLevels.get("halo") || 1);
      const haloPrimaryDur = getChurchPowerupInstanceDuration(config.duration, haloLevel, 1);
      const haloSecondaryDur = getChurchPowerupInstanceDuration(config.duration, haloLevel, 2);
      const hadPrimary = (player.haloTimer || 0) > 0;
      const hadSecondary = (player.haloTimerSecondary || 0) > 0;
      if (hadPrimary && (haloSecondaryDur <= 0 || hadSecondary)) {
        player.haloTimerBonus = Math.max(player.haloTimerBonus || 0, haloPrimaryDur);
      }
      player.haloTimer = Math.max(player.haloTimer, haloPrimaryDur);
      player.haloDuration = Math.max(player.haloDuration, haloPrimaryDur);
      player.haloMaxDuration = config.duration;
      player.haloTimerSecondary = Math.max(player.haloTimerSecondary || 0, haloSecondaryDur);
      player.haloLevel = Math.max(player.haloLevel || 0, haloLevel);
      showWeaponPowerupConfigText(config);
      break;
    }
    case "spear": {
      const config = resolveWeaponPowerupConfig("spear", def);
      const spearLevel = Math.min(CHURCH_POWERUP_MAX_LEVEL, churchPowerupLevels.get("spear") || 1);
      const spearPrimaryDur = getChurchPowerupInstanceDuration(config.duration, spearLevel, 1);
      const spearSecondaryDur = getChurchPowerupInstanceDuration(config.duration, spearLevel, 2);
      const hadPrimary = (player.spearTimer || 0) > 0;
      const hadSecondary = (player.spearTimerSecondary || 0) > 0;
      if (hadPrimary && (spearSecondaryDur <= 0 || hadSecondary)) {
        player.spearTimerBonus = Math.max(player.spearTimerBonus || 0, spearPrimaryDur);
      }
      player.spearTimer = Math.max(player.spearTimer, spearPrimaryDur);
      player.spearDuration = Math.max(player.spearDuration, spearPrimaryDur);
      player.spearMaxDuration = config.duration;
      player.spearTimerSecondary = Math.max(player.spearTimerSecondary || 0, spearSecondaryDur);
      player.spearLevel = Math.max(player.spearLevel || 0, spearLevel);
      showWeaponPowerupConfigText(config);
      break;
    }
    case "sentry": {
      const config = resolveWeaponPowerupConfig("sentry", def);
      const sentryLevel = Math.min(CHURCH_POWERUP_MAX_LEVEL, churchPowerupLevels.get("sentry") || 1);
      const sentryPrimaryDur = getChurchPowerupInstanceDuration(config.duration, sentryLevel, 1);
      const sentrySecondaryDur = getChurchPowerupInstanceDuration(config.duration, sentryLevel, 2);
      const hadPrimary = (player.sentryTimer || 0) > 0;
      const hadSecondary = (player.sentryTimerSecondary || 0) > 0;
      if (hadPrimary && (sentrySecondaryDur <= 0 || hadSecondary)) {
        player.sentryTimerBonus = Math.max(player.sentryTimerBonus || 0, sentryPrimaryDur);
      }
      player.sentryTimer = Math.max(player.sentryTimer, sentryPrimaryDur);
      player.sentryDuration = Math.max(player.sentryDuration, sentryPrimaryDur);
      player.sentryMaxDuration = config.duration;
      player.sentryTimerSecondary = Math.max(player.sentryTimerSecondary || 0, sentrySecondaryDur);
      player.sentryLevel = Math.max(player.sentryLevel || 0, sentryLevel);
      showWeaponPowerupConfigText(config);
      break;
    }
    case "npcScriptureWeapon": {
      applyNpcWeaponPowerup("npcScriptureWeapon", def);
      triggerNpcPowerupDialogue("npcScriptureWeapon");
      showWeaponPowerupConfigText({
        text: "Quote Scripture",
        textColor: "#ffa45a",
        description: "NPCs fire scripture shots for a short time.",
        spokenName: "Scripture",
      });
      spawnPowerupHudFlyEffect({
        x: pickup.x,
        y: pickup.y,
        iconImage: def?.iconImage || null,
        targetKey: getPowerupHudTargetKey(pickup.effect),
      });
      break;
    }
    case "npcWisdomWeapon": {
      applyNpcWeaponPowerup("npcWisdomWeapon", def);
      triggerNpcPowerupDialogue("npcWisdomWeapon");
      showWeaponPowerupConfigText({
        text: "Apply Wisdom",
        textColor: "#9BD9FF",
        description: "NPCs launch wisdom missiles temporarily.",
        spokenName: "Wisdom",
      });
      spawnPowerupHudFlyEffect({
        x: pickup.x,
        y: pickup.y,
        iconImage: def?.iconImage || null,
        targetKey: getPowerupHudTargetKey(pickup.effect),
      });
      break;
    }
    case "npcFaithWeapon": {
      applyNpcWeaponPowerup("npcFaithWeapon", def);
      triggerNpcPowerupDialogue("npcFaithWeapon");
      showWeaponPowerupConfigText({
        text: "Act in Faith",
        textColor: "#ff9bf7",
        description: "NPCs fire faith cannon blasts briefly.",
        spokenName: "Faith",
      });
      spawnPowerupHudFlyEffect({
        x: pickup.x,
        y: pickup.y,
        iconImage: def?.iconImage || null,
        targetKey: getPowerupHudTargetKey(pickup.effect),
      });
      break;
    }
    default:
      break;
  }
  triggerPowerUpCooldown();
}

function shuffleArray(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function applyUtilityPowerUp(powerUp) {
  if (!player || !powerUp) return;
  powerUp.active = false;
  powerUp.visible = false;
  powerUp.expired = true;
  if (typeof window !== "undefined" && typeof window.playUtilityPowerupPickupSfx === "function") {
    window.playUtilityPowerupPickupSfx(0.55);
  }
  const { effect, duration = 6, speedMultiplier, extendMultiplier } = powerUp.definition;
  const utilityTitle = powerUp.definition.hudTitle || powerUp.definition.label || "Power Up";
  const utilitySpokenName = powerUp.definition.spokenName || utilityTitle;
  setWeaponPickupAnnouncement({
    title: utilityTitle,
    description: powerUp.definition.description || "",
    color: powerUp.definition.color || "#EAF6FF",
  });
  playerYell(utilitySpokenName, 3.2);
  switch (effect) {
    case "shield":
      player.shieldTimer = Math.max(player.shieldTimer, duration);
      player.shieldDuration = Math.max(player.shieldDuration || 0, duration);
      spawnPowerupHudFlyEffect({
        x: powerUp.x,
        y: powerUp.y,
        iconImage: powerUp.definition?.iconImage || null,
        targetKey: getPowerupHudTargetKey(effect),
      });
      break;
    case "haste":
      player.speedBoostTimer = Math.max(player.speedBoostTimer, duration);
      player.speedBoostDuration = Math.max(player.speedBoostDuration || 0, duration);
      spawnPowerupHudFlyEffect({
        x: powerUp.x,
        y: powerUp.y,
        iconImage: powerUp.definition?.iconImage || null,
        targetKey: getPowerupHudTargetKey(effect),
      });
      break;
    case "extend":
      const extendDuration = Math.max(
        duration,
        player.powerExtendTimer,
        player.powerExtendDuration,
      );
      player.powerExtendTimer = Math.max(player.powerExtendTimer, extendDuration);
      player.powerExtendDuration = Math.max(player.powerExtendDuration, player.powerExtendTimer);
      if (player.weaponPowerTimer > 0) {
        const factor = Number.isFinite(extendMultiplier) ? extendMultiplier : 1.5;
        player.weaponPowerTimer *= factor;
        player.weaponPowerDuration *= factor;
        const meterDuration = player.weaponPowerDuration;
        if (meterDuration > 0) {
          const ratioAfterFactor = player.weaponPowerTimer / meterDuration;
          if (ratioAfterFactor < 0.25) {
            player.weaponPowerTimer = Math.max(
              player.weaponPowerTimer,
              meterDuration * 0.5,
            );
          } else if (ratioAfterFactor > 0.5) {
            player.weaponPowerTimer = Math.min(
              meterDuration,
              player.weaponPowerTimer + meterDuration * 0.25,
            );
          }
        }
      }
      player.weaponPowerTimer = Math.min(
        player.weaponPowerTimer,
        player.weaponPowerDuration,
      );
      spawnPowerupHudFlyEffect({
        x: powerUp.x,
        y: powerUp.y,
        iconImage: powerUp.definition?.iconImage || null,
        targetKey: getPowerupHudTargetKey(effect),
      });
      break;
    case "harmony":
      npcHarmonyBuffTimer = Math.max(npcHarmonyBuffTimer, duration);
      npcHarmonyBuffDuration = Math.max(npcHarmonyBuffDuration, duration);
      triggerNpcPowerupDialogue("harmony");
      spawnPowerupHudFlyEffect({
        x: powerUp.x,
        y: powerUp.y,
        iconImage: powerUp.definition?.iconImage || null,
        targetKey: getPowerupHudTargetKey(effect),
      });
      break;
    case "smiteBomb": {
      const bombDamage = Math.max(0, Math.round(Number(powerUp.definition?.damage) || 200));
      if (typeof playPrayerBombSfx === "function") {
        playPrayerBombSfx(0.85);
      }
      applyCameraShake(CAMERA_SHAKE_DURATION, CAMERA_SHAKE_INTENSITY * 1.35);
      let hitAny = false;
      projectiles.forEach((projectile) => {
        if (!projectile || projectile.dead || projectile.friendly || projectile.visualOnly) return;
        projectile.dead = true;
        spawnImpactEffect(projectile.x, projectile.y);
        spawnFlashEffect(projectile.x, projectile.y);
        hitAny = true;
      });
      enemies.forEach((enemy) => {
        if (!enemy || enemy.dead || enemy.state === "death") return;
        enemy.takeDamage(bombDamage, { damageType: "charged" });
        spawnEnemyHitEffect(enemy);
        hitAny = true;
      });
      if (activeBoss && !activeBoss.dead && !activeBoss.defeated && !activeBoss.removed) {
        activeBoss.takeDamage(bombDamage, {
          hitX: activeBoss.x,
          hitY: activeBoss.y,
          damageType: "charged",
        });
        spawnEnemyHitEffect(activeBoss);
        hitAny = true;
      }
      if (hitAny && typeof playEnemyHitSfx === "function") {
        playEnemyHitSfx(0.75);
      }
      break;
    }
    default:
      break;
  }
  triggerPowerUpCooldown();
}

function evacuateNpcsForBoss() {
  evacuatedNpcCount = npcs.length || 2;
  npcs.splice(0, npcs.length);
  npcsSuspended = true;
}

function restoreNpcsAfterBoss() {
  if (evacuatedNpcCount > 0) {
    npcsSuspended = false;
    resetCozyNpcs(evacuatedNpcCount);
    evacuatedNpcCount = 0;
  }
}

function updateUtilityPowerUps(dt) {
  for (let i = utilityPowerUps.length - 1; i >= 0; i -= 1) {
    const powerUp = utilityPowerUps[i];
    powerUp.update(dt);
    if (powerUp.expired) {
      utilityPowerUps.splice(i, 1);
      triggerPowerUpCooldown();
      continue;
    }
    if (!player) continue;
    const dx = powerUp.x - player.x;
    const dy = powerUp.y - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= (powerUp.radius || 24) + player.radius * 0.7) {
      applyUtilityPowerUp(powerUp);
      utilityPowerUps.splice(i, 1);
    }
  }
}

function updateWeaponPickups(dt) {
  weaponPickups.forEach((pickup) => {
    if (!pickup) return;
    pickup.update(dt);
    if (!pickup.active) return;
    resolveEntityCollisions(pickup, weaponPickups, { allowPush: true, overlapScale: 1 });
    resolveEntityCollisions(pickup, enemies, { allowPush: true, overlapScale: 1 });
    resolveEntityCollisions(pickup, [player], { allowPush: true, overlapScale: 1 });
    clampEntityToBounds(pickup);
  });

  for (let i = weaponPickups.length - 1; i >= 0; i -= 1) {
    const pickup = weaponPickups[i];
    if (!pickup) continue;
    if (pickup.expired || !pickup.active) {
      weaponPickups.splice(i, 1);
      triggerPowerUpCooldown();
      continue;
    }
    if (!player) continue;
    const dx = pickup.x - player.x;
    const dy = pickup.y - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= (pickup.radius || 0) + player.radius) {
      applyWeaponPickupEffect(pickup);
      weaponPickups.splice(i, 1);
    }
  }
}

function updateChurchPowerupPickups(dt) {
  churchPowerupPickups.forEach((pickup) => {
    if (!pickup) return;
    pickup.update(dt);
    if (!pickup.active) return;
    resolveEntityCollisions(pickup, churchPowerupPickups, { allowPush: true, overlapScale: 1 });
    resolveEntityCollisions(pickup, enemies, { allowPush: true, overlapScale: 1 });
    resolveEntityCollisions(pickup, [player], { allowPush: true, overlapScale: 1 });
    clampEntityToBounds(pickup);
  });

  for (let i = churchPowerupPickups.length - 1; i >= 0; i -= 1) {
    const pickup = churchPowerupPickups[i];
    if (!pickup) continue;
    if (pickup.expired || !pickup.active) {
      churchPowerupPickups.splice(i, 1);
      triggerPowerUpCooldown();
      continue;
    }
    if (!player) continue;
    const dx = pickup.x - player.x;
    const dy = pickup.y - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= (pickup.radius || 0) + player.radius) {
      applyWeaponPickupEffect(pickup);
      churchPowerupPickups.splice(i, 1);
    }
  }
}

function spawnGracePickup(x, y, options = {}) {
  const frames = assets?.items?.gracePickup?.frames;
  if (!frames || !frames.length) return null;
  const pickup = {
    x,
    y,
    radius: options.radius || GRACE_PICKUP_RADIUS,
    frames,
    frameIndex: Math.floor(Math.random() * frames.length),
    frameTimer: Math.random() * GRACE_PICKUP_FRAME_DURATION,
    frameDuration: GRACE_PICKUP_FRAME_DURATION,
    bobTimer: Math.random() * Math.PI * 2,
    value: Math.max(1, Math.round(options.value || 1)),
    life: options.life || GRACE_PICKUP_LIFETIME,
    vx: options.vx ?? (options.scatter ? randomInRange(-90, 90) : 0),
    vy: options.vy ?? (options.scatter ? randomInRange(-180, -60) : 0),
    gravity: options.gravity ?? GRACE_PICKUP_GRAVITY,
    useGravity: options.useGravity ?? false,
    bounce: options.bounce ?? false,
    trackViewportXBounds: Boolean(options.trackViewportXBounds),
    minX: Number.isFinite(options.minX) ? options.minX : null,
    maxX: Number.isFinite(options.maxX) ? options.maxX : null,
    floorY: Number.isFinite(options.floorY) ? options.floorY : GRACE_PICKUP_FLOOR_Y(),
    bounceDamp: Number.isFinite(options.bounceDamp) ? options.bounceDamp : 0.5,
    airDrag: Number.isFinite(options.airDrag) ? options.airDrag : GRACE_PICKUP_AIR_DRAG,
    collected: false,
    spawnBlink: 0.2,
    blinkTimer: 0,
    blinkAlpha: 1,
  };
  pickup.blinkAlpha = 1;
  pickup.draw = (context) => {
    const frame = pickup.frames[Math.floor(pickup.frameIndex) % pickup.frames.length];
    if (!frame) return;
    const size = Math.max(18, frame.width || 32);
    const bob = pickup.grounded ? 0 : Math.sin(pickup.bobTimer) * 4;
    let alpha =
      pickup.spawnBlink > 0 ? Math.max(0.3, 1 - pickup.spawnBlink * 2) : 1;
    if (pickup.life <= 3 && typeof pickup.blinkAlpha === "number") {
      alpha *= pickup.blinkAlpha;
    }
    context.save();
    context.globalAlpha = alpha;
    context.translate(pickup.x, pickup.y + bob);
    context.drawImage(frame, -size / 2, -size / 2, size, size);
    context.restore();
  };
  gracePickups.push(pickup);
  return pickup;
}

function spawnGraceHudFlyEffect(pickup) {
  const target = typeof window !== "undefined" ? window.__hudGraceIconPos : null;
  const frame = pickup?.frames?.[0];
  if (!target || !frame) return;
  const startX = pickup.x - cameraOffsetX;
  const startY = pickup.y;
  graceHudFlyEffects.push({
    frame,
    startX,
    startY,
    x: startX,
    y: startY,
    targetX: target.x,
    targetY: target.y,
    timer: 0,
    duration: 0.45,
    size: Math.max(14, frame.width || 16),
    alpha: 1,
  });
}

function updateGraceHudFlyEffects(dt) {
  if (!graceHudFlyEffects.length) return;
  for (let i = graceHudFlyEffects.length - 1; i >= 0; i -= 1) {
    const effect = graceHudFlyEffects[i];
    if (!effect) continue;
    effect.timer += dt;
    const t = Math.min(1, effect.timer / Math.max(0.001, effect.duration));
    const ease = 1 - Math.pow(1 - t, 3);
    effect.x = effect.startX + (effect.targetX - effect.startX) * ease;
    effect.y = effect.startY + (effect.targetY - effect.startY) * ease;
    effect.alpha = Math.max(0, 1 - t * 0.15);
    if (t >= 1) {
      graceHudFlyEffects.splice(i, 1);
    }
  }
}

function getPowerupHudTargetKey(effect) {
  if (!effect) return null;
  if (effect === "shield") return "utilityShield";
  if (effect === "haste") return "utilityHaste";
  if (effect === "extend") return "utilityExtend";
  if (effect === "harmony") return "npcHarmony";
  if (String(effect).startsWith("npc")) return "npcWeapon";
  if (WEAPON_POWERUP_EFFECTS.has(effect) || effect === "arrowBuff") return "playerWeapon";
  return null;
}

function spawnPowerupHudFlyEffect({ x, y, iconImage, targetKey }) {
  if (!targetKey) return;
  const targetMap = typeof window !== "undefined" ? window.__hudPowerupIconPos : null;
  const target = targetMap ? targetMap[targetKey] : null;
  if (!iconImage || !iconImage.complete) return;
  const startX = x - cameraOffsetX;
  const startY = y;
  powerupHudFlyEffects.push({
    image: iconImage,
    startX,
    startY,
    x: startX,
    y: startY,
    targetX: target ? target.x : startX,
    targetY: target ? target.y : startY,
    targetKey,
    targetReady: Boolean(target),
    timer: 0,
    duration: 0.5,
    size: Math.max(16, iconImage.width || 16),
    alpha: 1,
  });
}

function updateHaloBladeInstance(state, angle, dt) {
  const depth = Math.sin(angle);
  const radiusX = state.radius;
  const radiusY = state.radius * 0.7;
  const prevX = state.x;
  const prevY = state.y;
  state.x = player.x + Math.cos(angle) * radiusX;
  state.y = player.y + depth * radiusY;
  state.angle = angle;
  const travel = Math.hypot(state.x - prevX, state.y - prevY);
  state.trailTimer += travel;
  if (state.trailTimer >= state.trailSpacing) {
    state.trailTimer = 0;
    state.trail.push({
      x: state.x,
      y: state.y,
      life: state.trailLife,
      maxLife: state.trailLife,
    });
    if (state.trail.length > state.maxTrail) {
      state.trail.shift();
    }
  }
  if (state.trail.length) {
    state.trail.forEach((point) => {
      point.life -= dt;
    });
    while (state.trail.length && state.trail[0].life <= 0) {
      state.trail.shift();
    }
  }

  const now =
    (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
  const hitRadius = state.hitRadius;
  const tetherDamage = Math.max(1, Math.round((state.damage || 0) * (state.tetherDamageMultiplier || 0.65)));
  const tetherHitRadius = Math.max(0, Number(state.tetherHitRadius) || 0);
  const tetherStartX = player.x;
  const tetherStartY = player.y - (player.radius || 24) * 0.18;
  const tetherEndX = state.x;
  const tetherEndY = state.y;

  enemies.forEach((enemy) => {
    if (!enemy || enemy.dead || enemy.state === "death") return;
    const center = getEnemyHitboxCenter(enemy);
    const targetRadius = getEnemyHitboxRadius(enemy);
    const dx = center.x - state.x;
    const dy = center.y - state.y;
    const bladeHit = dx * dx + dy * dy <= (hitRadius + targetRadius) ** 2;
    let tetherHit = false;
    let tetherImpactX = center.x;
    let tetherImpactY = center.y;
    if (!bladeHit && tetherHitRadius > 0) {
      const closest = closestPointOnSegment(
        center.x,
        center.y,
        tetherStartX,
        tetherStartY,
        tetherEndX,
        tetherEndY,
      );
      const cdx = center.x - closest.x;
      const cdy = center.y - closest.y;
      tetherHit = cdx * cdx + cdy * cdy <= (targetRadius + tetherHitRadius) ** 2;
      tetherImpactX = closest.x;
      tetherImpactY = closest.y;
    }
    if (!bladeHit && !tetherHit) return;
    const lastHit = state.lastHit.get(enemy) || 0;
    if (now - lastHit < state.hitCooldown) return;
    state.lastHit.set(enemy, now);
    const enemyDamageClass = String(enemy.damageClass || enemy.config?.damageClass || "").toLowerCase();
    const baseDamage = bladeHit ? state.damage : tetherDamage;
    const bladeArmorBonus = bladeHit && (enemyDamageClass === "armored" || enemyDamageClass === "tank");
    const haloDamage = bladeArmorBonus ? baseDamage * 2 : baseDamage;
    enemy.takeDamage(haloDamage, { damageType: "melee" });
    registerComboHit(enemy, haloDamage);
    spawnFlashEffect(
      bladeHit ? center.x : tetherImpactX,
      bladeHit ? center.y - targetRadius * 0.3 : tetherImpactY,
    );
  });

  if (activeBoss && !activeBoss.dead && !activeBoss.defeated) {
    const dx = activeBoss.x - state.x;
    const dy = activeBoss.y - state.y;
    const bossBladeHit = dx * dx + dy * dy <= (hitRadius + activeBoss.radius * 0.9) ** 2;
    let bossTetherHit = false;
    let bossImpactX = activeBoss.x;
    let bossImpactY = activeBoss.y;
    if (!bossBladeHit && tetherHitRadius > 0) {
      const closest = closestPointOnSegment(
        activeBoss.x,
        activeBoss.y,
        tetherStartX,
        tetherStartY,
        tetherEndX,
        tetherEndY,
      );
      const cdx = activeBoss.x - closest.x;
      const cdy = activeBoss.y - closest.y;
      bossTetherHit = cdx * cdx + cdy * cdy <= (activeBoss.radius * 0.9 + tetherHitRadius) ** 2;
      bossImpactX = closest.x;
      bossImpactY = closest.y;
    }
    if (bossBladeHit || bossTetherHit) {
      const lastHit = state.lastHit.get(activeBoss) || 0;
      if (now - lastHit >= state.hitCooldown) {
        state.lastHit.set(activeBoss, now);
        const bossDamage = bossBladeHit ? state.damage : tetherDamage;
        activeBoss.takeDamage(bossDamage, {
          hitX: bossBladeHit ? state.x : bossImpactX,
          hitY: bossBladeHit ? state.y : bossImpactY,
          damageType: "melee",
          skipImpactEffect: true,
        });
        registerComboHit(activeBoss, bossDamage);
        spawnFlashEffect(
          bossBladeHit ? state.x : bossImpactX,
          bossBladeHit ? state.y : bossImpactY,
        );
      }
    }
  }
}

function resetHaloBladeState(state) {
  state.active = false;
  state.trail.length = 0;
  state.trailTimer = 0;
  state.lastHit = new WeakMap();
}

function updateHaloBlade(dt) {
  const hasPrimary = (player?.haloTimer || 0) > 0;
  const hasSecondary = (player?.haloTimerSecondary || 0) > 0;
  const hasBonus = (player?.haloTimerBonus || 0) > 0;
  if (!player || player.state === "death" || (!hasPrimary && !hasSecondary && !hasBonus)) {
    resetHaloBladeState(haloBladeState);
    resetHaloBladeState(haloBladeStateSecondary);
    resetHaloBladeState(haloBladeStateBonus);
    return;
  }
  haloBladeState.active = true;
  if (!haloBladeState.sprite && assets?.churchPowerups?.halo?.image) {
    haloBladeState.sprite = assets.churchPowerups.halo.image;
  }
  if (!haloBladeStateSecondary.sprite) {
    haloBladeStateSecondary.sprite = haloBladeState.sprite;
  }
  if (!haloBladeStateBonus.sprite) {
    haloBladeStateBonus.sprite = haloBladeState.sprite;
  }
  const angle = (haloBladeState.angle || 0) + haloBladeState.speed * dt;
  const baseAngle = angle % (Math.PI * 2);
  haloBladeState.angle = baseAngle;
  updateHaloBladeInstance(haloBladeState, baseAngle, dt);

  if (hasSecondary) {
    haloBladeStateSecondary.active = true;
    updateHaloBladeInstance(haloBladeStateSecondary, baseAngle + Math.PI, dt);
  } else {
    resetHaloBladeState(haloBladeStateSecondary);
  }
  if (hasBonus) {
    haloBladeStateBonus.active = true;
    updateHaloBladeInstance(haloBladeStateBonus, baseAngle + (Math.PI * 2) / 3, dt);
  } else {
    resetHaloBladeState(haloBladeStateBonus);
  }
}

function getSpearTargetCenter(target) {
  if (!target) return null;
  if (target === activeBoss) {
    return { x: activeBoss.x, y: activeBoss.y, radius: activeBoss.radius || 0 };
  }
  if (target instanceof Projectile || (target && target.visualOnly !== undefined && target.friendly !== undefined)) {
    return { x: target.x || 0, y: target.y || 0, radius: target.radius || 0 };
  }
  const center = getEnemyHitboxCenter(target);
  return { x: center.x, y: center.y, radius: getEnemyHitboxRadius(target) };
}

function hasSpearTargets() {
  const hasEnemy = enemies.some((enemy) => isEnemyTargetableForAutoAim(enemy));
  if (hasEnemy) return true;
  const hasProjectile = projectiles.some(
    (projectile) => projectile && !projectile.dead && !projectile.friendly && !projectile.visualOnly,
  );
  if (hasProjectile) return true;
  return Boolean(activeBoss && !activeBoss.dead && !activeBoss.defeated);
}

function getSingleSpearTarget() {
  let target = null;
  let count = 0;
  enemies.forEach((enemy) => {
    if (!isEnemyTargetableForAutoAim(enemy)) return;
    count += 1;
    if (count > 1) return;
    target = enemy;
  });
  projectiles.forEach((projectile) => {
    if (!projectile || projectile.dead || projectile.friendly || projectile.visualOnly) return;
    count += 1;
    if (count > 1) return;
    target = projectile;
  });
  if (activeBoss && !activeBoss.dead && !activeBoss.defeated) {
    count += 1;
    if (count > 1) return null;
    target = activeBoss;
  }
  return count === 1 ? target : null;
}

function findNearestSpearTarget(fromX, fromY, options = {}) {
  const exclude = options.exclude || null;
  const minDistanceFrom = options.minDistanceFrom || null;
  const minDistance = Number.isFinite(options.minDistance) ? options.minDistance : 0;
  let best = null;
  let bestDist = Infinity;
  enemies.forEach((enemy) => {
    if (!isEnemyTargetableForAutoAim(enemy)) return;
    if (exclude && enemy === exclude) return;
    if (minDistanceFrom) {
      const dxFrom = getEnemyHitboxCenter(enemy).x - minDistanceFrom.x;
      const dyFrom = getEnemyHitboxCenter(enemy).y - minDistanceFrom.y;
      if (Math.hypot(dxFrom, dyFrom) < minDistance) return;
    }
    const center = getEnemyHitboxCenter(enemy);
    const dx = center.x - fromX;
    const dy = center.y - fromY;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = enemy;
    }
  });
  projectiles.forEach((projectile) => {
    if (!projectile || projectile.dead || projectile.friendly || projectile.visualOnly) return;
    if (exclude && projectile === exclude) return;
    if (minDistanceFrom) {
      const dxFrom = (projectile.x || 0) - minDistanceFrom.x;
      const dyFrom = (projectile.y || 0) - minDistanceFrom.y;
      if (Math.hypot(dxFrom, dyFrom) < minDistance) return;
    }
    const dx = (projectile.x || 0) - fromX;
    const dy = (projectile.y || 0) - fromY;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = projectile;
    }
  });
  if (activeBoss && !activeBoss.dead && !activeBoss.defeated && exclude !== activeBoss) {
    if (minDistanceFrom) {
      const dxFrom = activeBoss.x - minDistanceFrom.x;
      const dyFrom = activeBoss.y - minDistanceFrom.y;
      if (Math.hypot(dxFrom, dyFrom) < minDistance) {
        return best;
      }
    }
    const dx = activeBoss.x - fromX;
    const dy = activeBoss.y - fromY;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      best = activeBoss;
    }
  }
  return best;
}

function isSentryBoreTarget(target) {
  if (!target) return false;
  const damageClass = String(target.damageClass || target.config?.damageClass || "").toLowerCase();
  return damageClass === "tank" || damageClass === "armored";
}

function collectSentryBeamHits(state, originX, originY, dirX, dirY, maxDistance) {
  const hits = [];
  let armoredTarget = null;
  let armoredDist = Infinity;
  const checkTarget = (target, center, baseRadius, allowBore) => {
    const dx = center.x - originX;
    const dy = center.y - originY;
    const t = dx * dirX + dy * dirY;
    if (t < 0 || t > maxDistance) return;
    const px = originX + dirX * t;
    const py = originY + dirY * t;
    const dist = Math.hypot(center.x - px, center.y - py);
    const radius = (state.hitRadius || 0) + baseRadius;
    if (dist > radius) return;
    hits.push({ target, hitX: px, hitY: py, dist: t });
    if (allowBore && isSentryBoreTarget(target) && t < armoredDist) {
      armoredDist = t;
      armoredTarget = target;
    }
  };

  enemies.forEach((enemy) => {
    if (!isEnemyTargetableForAutoAim(enemy)) return;
    const center = getEnemyHitboxCenter(enemy);
    const radius = getEnemyHitboxRadius(enemy) * 0.6;
    checkTarget(enemy, center, radius, true);
  });
  projectiles.forEach((projectile) => {
    if (!projectile || projectile.dead || projectile.friendly || projectile.visualOnly) return;
    checkTarget(
      projectile,
      { x: projectile.x || 0, y: projectile.y || 0 },
      Math.max(6, (projectile.radius || 0) * 0.9),
      false,
    );
  });

  if (activeBoss && !activeBoss.dead && !activeBoss.defeated) {
    const radius = (activeBoss.radius || 0) * 0.8;
    checkTarget(activeBoss, { x: activeBoss.x, y: activeBoss.y }, radius, false);
  }

  return { hits, armoredTarget, armoredDist };
}

function resetSentryState(state) {
  state.active = false;
  state.beamActive = false;
  state.beamProgress = 0;
  state.beamLength = 0;
  state.beamEndX = state.x;
  state.beamEndY = state.y;
  state.baseAngle = state.angle || 0;
  state.beamCooldownTimer = 0;
  state.hitTimer = 0;
  state.burnTimer = 0;
  state.boreSfxTimer = 0;
  state.beamStartDelayTimer = 0;
  state.beamHitSfxTimer = 0;
  if (state.burnEffect) state.burnEffect.dead = true;
  state.burnEffect = null;
  state.target = null;
  state.lockedTarget = null;
}

function updateSentryTurretInstance(state, dt) {
  if (!state) return;
  const home = getNpcHomeBounds();
  const centerX = home ? home.x : canvas.width / 2;
  const centerY = home ? home.y : HUD_HEIGHT + (canvas.height - HUD_HEIGHT) / 3;
  let baseX = centerX + (state.offsetX || 0);
  let baseY = centerY + (state.offsetY || 0);
  if (state.orbitEnabled) {
    const radius = Number.isFinite(state.orbitRadius) ? state.orbitRadius : 0;
    const angle = sentryOrbitAngle + (state.orbitAngleOffset || 0);
    baseX = centerX + Math.cos(angle) * radius;
    baseY = centerY + Math.sin(angle) * radius;
  }
  state.baseX = baseX;
  state.baseY = baseY;
  state.floatTimer = (state.floatTimer || 0) + dt * (state.floatSpeed || 1);
  state.x = baseX;
  state.y = baseY + Math.sin(state.floatTimer) * (state.floatAmplitude || 0);
  state.active = true;

  if (state.beamCooldownTimer > 0) {
    state.beamCooldownTimer = Math.max(0, state.beamCooldownTimer - dt);
  }

  if (!state.beamActive) {
    if (state.beamCooldownTimer > 0) return;
    if (state.beamStartDelay > 0) {
      if (state.beamStartDelayTimer <= 0) {
        state.beamStartDelayTimer = state.beamStartDelay;
      } else {
        state.beamStartDelayTimer = Math.max(0, state.beamStartDelayTimer - dt);
      }
      if (state.beamStartDelayTimer > 0) return;
    }
    const initialTarget = findNearestSpearTarget(state.x, state.y);
    if (!initialTarget) return;
    state.beamActive = true;
    state.beamProgress = 0;
    state.beamLength = 0;
    state.hitTimer = 0;
    state.boreSfxTimer = 0;
    state.beamStartDelayTimer = 0;
    state.lockedTarget = null;
    const center = getSpearTargetCenter(initialTarget);
    state.angle = Math.atan2(center.y - state.y, center.x - state.x);
    state.target = initialTarget;
    state.baseAngle = state.angle || 0;
    playSentryBeamSfx(0.5);
  }

  if (!state.beamActive) return;

  state.burnTimer = Math.max(0, (state.burnTimer || 0) - dt);
  if (state.burnEffect && state.burnEffect.dead) {
    state.burnEffect = null;
  }

  if (state.lockedTarget && (state.lockedTarget.dead || state.lockedTarget.state === "death")) {
    state.lockedTarget = null;
  }
  if (!state.lockedTarget && state.burnEffect) {
    state.burnEffect.dead = true;
    state.burnEffect = null;
  }

  const aimTarget = state.lockedTarget || findNearestSpearTarget(state.x, state.y);
  if (!aimTarget && !state.lockedTarget) {
    state.beamActive = false;
    state.beamProgress = 0;
    state.beamLength = 0;
    state.hitTimer = 0;
    return;
  }
  if (aimTarget) {
    const center = getSpearTargetCenter(aimTarget);
    const desiredAngle = Math.atan2(center.y - state.y, center.x - state.x);
    const currentAngle = state.angle || 0;
    const maxOffset = Math.PI / 18;
    const baseAngle = state.baseAngle || 0;
    let diff = desiredAngle - baseAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const clampedTarget = baseAngle + Math.max(-maxOffset, Math.min(maxOffset, diff));
    const turnSpeed = 3.6;
    state.angle = approachAngle(currentAngle, clampedTarget, turnSpeed * dt);
    state.target = aimTarget;
  }

  const dirX = Math.cos(state.angle || 0);
  const dirY = Math.sin(state.angle || 0);
  const maxDistance = distanceToArenaEdge(state.x, state.y, dirX, dirY);
  const hitInfo = collectSentryBeamHits(state, state.x, state.y, dirX, dirY, maxDistance);

  let blockDistance = maxDistance;
  if (state.lockedTarget) {
    const center = getSpearTargetCenter(state.lockedTarget);
    if (center) {
      const dx = center.x - state.x;
      const dy = center.y - state.y;
      const t = dx * dirX + dy * dirY;
      if (t > 0) {
        blockDistance = Math.min(blockDistance, t);
      } else {
        state.lockedTarget = null;
      }
    } else {
      state.lockedTarget = null;
    }
  }
  if (!state.lockedTarget && hitInfo.armoredTarget && Number.isFinite(hitInfo.armoredDist)) {
    state.lockedTarget = hitInfo.armoredTarget;
    blockDistance = Math.min(blockDistance, hitInfo.armoredDist);
  }

  const speed = Math.max(1, state.beamSpeed || 1);
  state.beamProgress = Math.min(state.beamProgress + speed * dt, blockDistance);
  state.beamLength = Math.min(state.beamProgress, maxDistance);
  state.beamEndX = state.x + dirX * state.beamLength;
  state.beamEndY = state.y + dirY * state.beamLength;

  const isBoringActive =
    state.lockedTarget &&
    !state.lockedTarget.dead &&
    state.lockedTarget.state !== "death" &&
    isSentryBoreTarget(state.lockedTarget);
  if (isBoringActive) {
    state.boreSfxTimer = Math.max(0, (state.boreSfxTimer || 0) - dt);
    if (state.boreSfxTimer <= 0) {
      playSentryBoreLoopSfx(0.9);
      state.boreSfxTimer = 0.12;
    }
  } else {
    state.boreSfxTimer = 0;
  }

  if (!state.lockedTarget && state.beamProgress >= maxDistance) {
    state.beamActive = false;
    state.beamCooldownTimer = state.beamCooldown || 1;
    state.beamProgress = 0;
    state.beamLength = 0;
    state.hitTimer = 0;
    return;
  }

  state.hitTimer += dt;
  state.beamHitSfxTimer = Math.max(0, (state.beamHitSfxTimer || 0) - dt);
  const interval = Math.max(0.01, state.hitInterval || 0.05);
  while (state.hitTimer >= interval) {
    state.hitTimer -= interval;
    if (state.beamLength <= 0) continue;
    const currentHits = collectSentryBeamHits(
      state,
      state.x,
      state.y,
      dirX,
      dirY,
      state.beamLength,
    );
    let hitSfxPlayed = false;
    currentHits.hits.forEach((hit) => {
      const target = hit.target;
      if (!target || target.dead || target.state === "death") return;
      const hitX = hit.hitX;
      const hitY = hit.hitY;
      if (target === activeBoss) {
        activeBoss.takeDamage(state.damage, {
          hitX,
          hitY,
          damageType: "projectile",
          skipImpactEffect: true,
        });
        registerComboHit(activeBoss, state.damage);
      } else if (target instanceof Projectile || (target.visualOnly !== undefined && target.friendly !== undefined)) {
        // Hostile projectile — destroy it, no takeDamage method exists
        const destroyed = target.maxDurability > 0
          ? applyProjectileDurabilityDamage(target, state.damage)
          : ((target.dead = true), true);
        if (destroyed) {
          spawnImpactEffect(hitX, hitY);
        }
      } else {
        target.takeDamage(state.damage, { damageType: "projectile" });
        registerComboHit(target, state.damage);
      }
      const targetHealth =
        target === activeBoss ? activeBoss?.health : target?.health;
      const targetDead = Number.isFinite(targetHealth) ? targetHealth <= 0 : false;
      const isBoreTarget =
        state.lockedTarget && target === state.lockedTarget && isSentryBoreTarget(target);
      if (!isBoreTarget && !hitSfxPlayed && state.beamHitSfxTimer <= 0) {
        playSpearHitSfx(0.8);
        hitSfxPlayed = true;
        state.beamHitSfxTimer = 0.12;
      }
      if (isBoreTarget) {
        if (targetDead) {
          if (state.burnEffect) {
            state.burnEffect.dead = true;
            state.burnEffect = null;
          }
          spawnSentryBoreKillEffect(hitX, hitY);
          playSentryBoreKillSfx(1.0);
        } else {
          const burnFrames = assets?.effects?.sentryBurn;
          const burnFrame = burnFrames && burnFrames.length ? burnFrames[0] : null;
          const frameHeight = burnFrame?.height || 0;
          const scale = 1.6;
          const offsetY = frameHeight > 0 ? (frameHeight * scale) / 2 : 0;
          if (state.burnEffect) {
            state.burnEffect.x = hitX;
            state.burnEffect.y = hitY - offsetY + 5;
          } else if (!state.burnEffect) {
            state.burnEffect = spawnSentryBurnEffect(hitX, hitY - offsetY + 5);
          }
        }
      } else if (!targetDead) {
        spawnSentryBeamHitEffect(hitX, hitY);
      }
    });
  }
}

function updateSpearStateTrail(state, dt) {
  if (!state.trail.length) return;
  state.trail.forEach((point) => {
    point.life -= dt;
  });
  while (state.trail.length && state.trail[0].life <= 0) {
    state.trail.shift();
  }
}

function applySpearHit(state, target, hitX, hitY) {
  const now =
    (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
  const lastHit = state.lastHit.get(target) || 0;
  if (now - lastHit < state.hitCooldown) return false;
  state.lastHit.set(target, now);
  if (target === activeBoss) {
    activeBoss.takeDamage(state.damage, {
      hitX,
      hitY,
      damageType: "projectile",
      skipImpactEffect: true,
    });
    registerComboHit(activeBoss, state.damage);
  } else if (target instanceof Projectile || (target && target.visualOnly !== undefined && target.friendly !== undefined)) {
    const destroyed = target.maxDurability > 0
      ? applyProjectileDurabilityDamage(target, state.damage)
      : ((target.dead = true), true);
    if (destroyed) {
      spawnImpactEffect(hitX, hitY);
    }
  } else {
    target.takeDamage(state.damage, { damageType: "projectile" });
    registerComboHit(target, state.damage);
  }
  playSpearHitSfx(0.8);
  spawnFlashEffect(hitX, hitY);
  return true;
}

function applySpearPassThroughHits(state, fromX, fromY, toX, toY, exclude) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const lenSq = dx * dx + dy * dy || 1;
  const hitTest = (tx, ty, radius) => {
    const t = Math.max(0, Math.min(1, ((tx - fromX) * dx + (ty - fromY) * dy) / lenSq));
    const px = fromX + dx * t;
    const py = fromY + dy * t;
    const ddx = tx - px;
    const ddy = ty - py;
    return ddx * ddx + ddy * ddy <= radius * radius;
  };
  enemies.forEach((enemy) => {
    if (!enemy || enemy.dead || enemy.state === "death") return;
    if (exclude && (enemy === exclude.target || enemy === exclude.last)) return;
    const center = getEnemyHitboxCenter(enemy);
    const radius = state.hitRadius + getEnemyHitboxRadius(enemy) * 0.6;
    if (hitTest(center.x, center.y, radius)) {
      applySpearHit(state, enemy, center.x, center.y);
    }
  });
  projectiles.forEach((projectile) => {
    if (!projectile || projectile.dead || projectile.friendly || projectile.visualOnly) return;
    if (exclude && (projectile === exclude.target || projectile === exclude.last)) return;
    const radius = state.hitRadius + Math.max(6, (projectile.radius || 0) * 0.9);
    if (hitTest(projectile.x || 0, projectile.y || 0, radius)) {
      applySpearHit(state, projectile, projectile.x || 0, projectile.y || 0);
    }
  });
  if (activeBoss && !activeBoss.dead && !activeBoss.defeated) {
    if (!(exclude && exclude.target === activeBoss)) {
      const radius = state.hitRadius + (activeBoss.radius || 0) * 0.8;
      if (hitTest(activeBoss.x, activeBoss.y, radius)) {
        applySpearHit(state, activeBoss, activeBoss.x, activeBoss.y);
      }
    }
  }
}

function resetSpearState(state) {
  state.active = false;
  state.trail.length = 0;
  state.trailTimer = 0;
  state.target = null;
  state.pauseTimer = 0;
  state.pendingRetarget = false;
  state.travelSinceHit = 0;
  state.hits = 0;
  state.lastTarget = null;
  state.lastHitPos = null;
  state.waypoint = null;
  state.lastHit = new WeakMap();
  state.startDelayTimer = 0;
  state.useSpawnOffset = false;
  state.spawnOffset.x = 0;
  state.spawnOffset.y = 0;
  state.turnSfxCooldown = 0;
}

function updateSpearDartInstance(state, dt) {
  const wasActive = state.active;
  state.active = true;
  state.turnSfxCooldown = Math.max(0, (state.turnSfxCooldown || 0) - dt);
  if (!wasActive) {
    if (state.useSpawnOffset) {
      state.x = player.x + state.spawnOffset.x;
      state.y = player.y + state.spawnOffset.y;
      state.useSpawnOffset = false;
    } else {
      state.x = player.x;
      state.y = player.y;
    }
    state.trail.length = 0;
    state.trailTimer = 0;
    state.target = null;
    state.pauseTimer = 0;
    state.pendingRetarget = false;
    state.travelSinceHit = 0;
    state.hits = 0;
    state.lastTarget = null;
    state.lastHitPos = null;
    state.waypoint = null;
    playSpearTurnSfx(0.6);
  }

  if (state.pauseTimer > 0) {
    state.pauseTimer = Math.max(0, state.pauseTimer - dt);
    updateSpearStateTrail(state, dt);
    return;
  }
  if (state.waypoint) {
    const prevX = state.x;
    const prevY = state.y;
    const dx = state.waypoint.x - state.x;
    const dy = state.waypoint.y - state.y;
    const distance = Math.hypot(dx, dy) || 1;
    const dirX = dx / distance;
    const dirY = dy / distance;
    const step = Math.min(distance, state.speed * dt);
    state.x += dirX * step;
    state.y += dirY * step;
    state.angle = Math.atan2(dirY, dirX);
    state.travelSinceHit += step;
    state.trailTimer += step;
    applySpearPassThroughHits(state, prevX, prevY, state.x, state.y, {
      target: state.target,
      last: state.lastTarget,
    });
    if (state.trailTimer >= state.trailSpacing) {
      state.trailTimer = 0;
      state.trail.push({
        x: state.x,
        y: state.y,
        life: state.trailLife,
        maxLife: state.trailLife,
      });
      if (state.trail.length > state.maxTrail) {
        state.trail.shift();
      }
    }
    updateSpearStateTrail(state, dt);
    if (distance <= state.hitRadius) {
      state.waypoint = null;
      state.pendingRetarget = true;
    }
    return;
  }
  if (state.pendingRetarget || !state.target || state.target.dead || state.target.state === "death") {
    const singleTarget = getSingleSpearTarget();
    if (
      singleTarget &&
      state.lastHitPos &&
      state.travelSinceHit < state.minTravel &&
      !state.waypoint
    ) {
      const awayDir = normalizeVector(
        state.x - state.lastHitPos.x,
        state.y - state.lastHitPos.y,
      );
      const fallbackDir = awayDir.x === 0 && awayDir.y === 0 ? { x: 1, y: 0 } : awayDir;
      const perp = { x: -fallbackDir.y, y: fallbackDir.x };
      const zigDir = state.hits % 2 === 0 ? perp : { x: -perp.x, y: -perp.y };
      const dir = zigDir.x === 0 && zigDir.y === 0 ? fallbackDir : zigDir;
      const minX = 20;
      const maxX = canvas.width - 20;
      const minY = HUD_HEIGHT + 20;
      const maxY = canvas.height - 20;
      const targetX = clamp(
        state.lastHitPos.x + dir.x * state.minTravel,
        minX,
        maxX,
      );
      const targetY = clamp(
        state.lastHitPos.y + dir.y * state.minTravel,
        minY,
        maxY,
      );
      state.waypoint = { x: targetX, y: targetY };
      if (state.turnSfxCooldown <= 0) {
        playSpearTurnSfx(0.6);
        state.turnSfxCooldown = 0.12;
      }
      return;
    }
    if (singleTarget) {
      state.target = singleTarget;
    } else {
      state.target = findNearestSpearTarget(state.x, state.y, {
        exclude: state.lastTarget,
        minDistanceFrom: state.lastHitPos,
        minDistance: state.minTravel,
      });
      if (!state.target) {
        state.target = findNearestSpearTarget(state.x, state.y, {
          exclude: state.lastTarget,
        });
      }
    }
    state.pendingRetarget = false;
    state.travelSinceHit = 0;
    if (state.target && state.turnSfxCooldown <= 0) {
      playSpearTurnSfx(0.6);
      state.turnSfxCooldown = 0.12;
    }
    if (!state.target && state.lastHitPos && hasSpearTargets()) {
      const awayDir = normalizeVector(
        state.x - state.lastHitPos.x,
        state.y - state.lastHitPos.y,
      );
      const fallbackDir = awayDir.x === 0 && awayDir.y === 0 ? { x: 1, y: 0 } : awayDir;
      const minX = 20;
      const maxX = canvas.width - 20;
      const minY = HUD_HEIGHT + 20;
      const maxY = canvas.height - 20;
      const targetX = clamp(
        state.lastHitPos.x + fallbackDir.x * state.minTravel,
        minX,
        maxX,
      );
      const targetY = clamp(
        state.lastHitPos.y + fallbackDir.y * state.minTravel,
        minY,
        maxY,
      );
      state.waypoint = { x: targetX, y: targetY };
      if (state.turnSfxCooldown <= 0) {
        playSpearTurnSfx(0.6);
        state.turnSfxCooldown = 0.12;
      }
      return;
    }
  }

  const target = state.target;
  if (!target) {
    if (!hasSpearTargets()) {
      const spinSpeed = Number.isFinite(state.searchSpinSpeed) ? state.searchSpinSpeed : 1.2;
      state.angle = ((state.angle || 0) + spinSpeed * dt) % (Math.PI * 2);
      updateSpearStateTrail(state, dt);
      return;
    }
    state.x = player.x;
    state.y = player.y;
    const spinSpeed = Number.isFinite(state.searchSpinSpeed) ? state.searchSpinSpeed : 1.2;
    state.angle = ((state.angle || 0) + spinSpeed * dt) % (Math.PI * 2);
    updateSpearStateTrail(state, dt);
    return;
  }

  const targetCenter = getSpearTargetCenter(target);
  if (!targetCenter) return;
  const prevX = state.x;
  const prevY = state.y;
  const dx = targetCenter.x - state.x;
  const dy = targetCenter.y - state.y;
  const distance = Math.hypot(dx, dy) || 1;
  const dirX = dx / distance;
  const dirY = dy / distance;
  const step = Math.min(distance, state.speed * dt);
  state.x += dirX * step;
  state.y += dirY * step;
  state.angle = Math.atan2(dirY, dirX);
  state.travelSinceHit += step;
  applySpearPassThroughHits(state, prevX, prevY, state.x, state.y, {
    target: state.target,
    last: state.lastTarget,
  });

  state.trailTimer += step;
  if (state.trailTimer >= state.trailSpacing) {
    state.trailTimer = 0;
    state.trail.push({
      x: state.x,
      y: state.y,
      life: state.trailLife,
      maxLife: state.trailLife,
    });
    if (state.trail.length > state.maxTrail) {
      state.trail.shift();
    }
  }
  updateSpearStateTrail(state, dt);

  const hitRadius = state.hitRadius + (targetCenter.radius || 0) * 0.6;
  const canHit =
    state.hits === 0 ||
    state.travelSinceHit >= state.minTravel;
  if (distance <= hitRadius && !canHit) {
    const away = normalizeVector(
      state.x - targetCenter.x,
      state.y - targetCenter.y,
    );
    const fallback = away.x === 0 && away.y === 0 ? { x: 1, y: 0 } : away;
    const pushStep = state.speed * dt;
    const pushPrevX = state.x;
    const pushPrevY = state.y;
    state.x += fallback.x * pushStep;
    state.y += fallback.y * pushStep;
    state.angle = Math.atan2(fallback.y, fallback.x);
    state.travelSinceHit += pushStep;
    state.trailTimer += pushStep;
    applySpearPassThroughHits(state, pushPrevX, pushPrevY, state.x, state.y, {
      target: state.target,
      last: state.lastTarget,
    });
    if (state.trailTimer >= state.trailSpacing) {
      state.trailTimer = 0;
      state.trail.push({
        x: state.x,
        y: state.y,
        life: state.trailLife,
        maxLife: state.trailLife,
      });
      if (state.trail.length > state.maxTrail) {
        state.trail.shift();
      }
    }
    updateSpearStateTrail(state, dt);
    return;
  }
  if (distance <= hitRadius && canHit) {
    applySpearHit(state, target, targetCenter.x, targetCenter.y);
    state.hits += 1;
    state.pauseTimer = state.pauseDuration;
    state.pendingRetarget = true;
    state.target = null;
    state.lastTarget = target;
    state.lastHitPos = { x: targetCenter.x, y: targetCenter.y };
    state.travelSinceHit = 0;
  }
}

function updateSpearDart(dt) {
  const hasPrimary = (player?.spearTimer || 0) > 0;
  const hasSecondary = (player?.spearTimerSecondary || 0) > 0;
  const hasBonus = (player?.spearTimerBonus || 0) > 0;
  if (!player || player.state === "death" || (!hasPrimary && !hasSecondary && !hasBonus)) {
    resetSpearState(spearState);
    resetSpearState(spearStateSecondary);
    resetSpearState(spearStateBonus);
    return;
  }
  if (!spearState.sprite && assets?.churchPowerups?.spear?.image) {
    spearState.sprite = assets.churchPowerups.spear.image;
  }
  if (!spearStateSecondary.sprite) {
    spearStateSecondary.sprite = spearState.sprite;
  }
  if (!spearStateBonus.sprite) {
    spearStateBonus.sprite = spearState.sprite;
  }
  updateSpearDartInstance(spearState, dt);
  if (hasSecondary) {
    if (!spearStateSecondary.active && spearStateSecondary.startDelayTimer <= 0) {
      spearStateSecondary.startDelayTimer = 0.1;
      spearStateSecondary.spawnOffset.x = 24 * WORLD_SCALE;
      spearStateSecondary.spawnOffset.y = -16 * WORLD_SCALE;
      spearStateSecondary.useSpawnOffset = true;
    }
    if (spearStateSecondary.startDelayTimer > 0) {
      spearStateSecondary.startDelayTimer = Math.max(0, spearStateSecondary.startDelayTimer - dt);
    }
    if (spearStateSecondary.startDelayTimer <= 0) {
      updateSpearDartInstance(spearStateSecondary, dt);
    }
  } else {
    resetSpearState(spearStateSecondary);
  }
  if (hasBonus) {
    if (!spearStateBonus.active && spearStateBonus.startDelayTimer <= 0) {
      spearStateBonus.startDelayTimer = 0.12;
      spearStateBonus.spawnOffset.x = -22 * WORLD_SCALE;
      spearStateBonus.spawnOffset.y = -18 * WORLD_SCALE;
      spearStateBonus.useSpawnOffset = true;
    }
    if (spearStateBonus.startDelayTimer > 0) {
      spearStateBonus.startDelayTimer = Math.max(0, spearStateBonus.startDelayTimer - dt);
    }
    if (spearStateBonus.startDelayTimer <= 0) {
      updateSpearDartInstance(spearStateBonus, dt);
    }
  } else {
    resetSpearState(spearStateBonus);
  }
}

function updateSentryTurret(dt) {
  const hasPrimary = (player?.sentryTimer || 0) > 0;
  const hasSecondary = (player?.sentryTimerSecondary || 0) > 0;
  const hasBonus = (player?.sentryTimerBonus || 0) > 0;
  if (!player || player.state === "death" || (!hasPrimary && !hasSecondary && !hasBonus)) {
    if (sentryState.active) {
      const sprite = sentryState.sprite;
      const radius =
        sprite && sprite.width
          ? Math.max(sprite.width, sprite.height) * (sentryState.scale || 1) * 0.35
          : 24 * WORLD_SCALE;
      spawnPuffEffect(sentryState.x, sentryState.y, radius * 3);
    }
    if (sentryStateSecondary.active) {
      const sprite = sentryStateSecondary.sprite;
      const radius =
        sprite && sprite.width
          ? Math.max(sprite.width, sprite.height) * (sentryStateSecondary.scale || 1) * 0.35
          : 24 * WORLD_SCALE;
      spawnPuffEffect(sentryStateSecondary.x, sentryStateSecondary.y, radius * 3);
    }
    if (sentryStateBonus.active) {
      const sprite = sentryStateBonus.sprite;
      const radius =
        sprite && sprite.width
          ? Math.max(sprite.width, sprite.height) * (sentryStateBonus.scale || 1) * 0.35
          : 24 * WORLD_SCALE;
      spawnPuffEffect(sentryStateBonus.x, sentryStateBonus.y, radius * 3);
    }
    resetSentryState(sentryState);
    resetSentryState(sentryStateSecondary);
    resetSentryState(sentryStateBonus);
    return;
  }
  const orbitSpeed = 0.6;
  sentryOrbitAngle = (sentryOrbitAngle + orbitSpeed * dt) % (Math.PI * 2);
  const fadeWindow = 2;
  const fadeAlpha =
    player.sentryTimer <= fadeWindow
      ? Math.max(0, player.sentryTimer / fadeWindow)
      : 1;
  sentryState.fadeAlpha = fadeAlpha;
  sentryStateSecondary.fadeAlpha = fadeAlpha;
  sentryStateBonus.fadeAlpha = fadeAlpha;
  if (!sentryState.sprite && assets?.churchPowerups?.sentry?.image) {
    sentryState.sprite = assets.churchPowerups.sentry.image;
  }
  if (!sentryStateSecondary.sprite) {
    sentryStateSecondary.sprite = sentryState.sprite;
  }
  if (!sentryStateBonus.sprite) {
    sentryStateBonus.sprite = sentryState.sprite;
  }
  updateSentryTurretInstance(sentryState, dt);
  if (hasSecondary) {
    updateSentryTurretInstance(sentryStateSecondary, dt);
  } else {
    resetSentryState(sentryStateSecondary);
  }
  if (hasBonus) {
    updateSentryTurretInstance(sentryStateBonus, dt);
  } else {
    resetSentryState(sentryStateBonus);
  }
}

function updatePowerupHudFlyEffects(dt) {
  if (!powerupHudFlyEffects.length) {
    if (typeof window !== "undefined") {
      window.__hudPowerupIconInFlight = {};
    }
    return;
  }
  if (typeof window !== "undefined") {
    window.__hudPowerupIconInFlight = {};
    powerupHudFlyEffects.forEach((effect) => {
      if (effect?.targetKey) window.__hudPowerupIconInFlight[effect.targetKey] = true;
    });
  }
  for (let i = powerupHudFlyEffects.length - 1; i >= 0; i -= 1) {
    const effect = powerupHudFlyEffects[i];
    if (!effect) continue;
    if (!effect.targetReady) {
      const targetMap = typeof window !== "undefined" ? window.__hudPowerupIconPos : null;
      const target = targetMap ? targetMap[effect.targetKey] : null;
      if (target) {
        effect.targetX = target.x;
        effect.targetY = target.y;
        effect.targetReady = true;
      } else {
        continue;
      }
    }
    effect.timer += dt;
    const t = Math.min(1, effect.timer / Math.max(0.001, effect.duration));
    const ease = 1 - Math.pow(1 - t, 3);
    effect.x = effect.startX + (effect.targetX - effect.startX) * ease;
    effect.y = effect.startY + (effect.targetY - effect.startY) * ease;
    effect.alpha = Math.max(0, 1 - t * 0.2);
    if (t >= 1) {
      powerupHudFlyEffects.splice(i, 1);
    }
  }
}

// combo HUD fly effects removed.

function spawnGraceBurst(count = 10, { centerX = canvas.width / 2, centerY = (canvas.height + HUD_HEIGHT) / 2, spread = 220 } = {}) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * spread * 0.8;
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;
    spawnGracePickup(x, y, { scatter: true });
  }
}

function spawnGraceRainBurst(
  count = 10,
  { centerX = canvas.width / 2, spread = 260, life = null, fullWidth = false } = {},
) {
  const area = getPlayfieldBounds();
  const spawnY = Math.max(area.minY - 140, HUD_HEIGHT - 140);
  const viewOffsetX = Number.isFinite(cameraOffsetX) ? cameraOffsetX : 0;
  const minRainX = viewOffsetX;
  const maxRainX = viewOffsetX + canvas.width;
  const clampedCenterX = Math.max(minRainX, Math.min(maxRainX, centerX));
  const spawnMinX = fullWidth ? minRainX : Math.max(minRainX, clampedCenterX - spread);
  const spawnMaxX = fullWidth ? maxRainX : Math.min(maxRainX, clampedCenterX + spread);
  for (let i = 0; i < count; i += 1) {
    const x = randomInRange(spawnMinX, Math.max(spawnMinX + 1, spawnMaxX));
    const vx = randomInRange(-60, 60);
    const vy = randomInRange(60, 140);
    const floorY = randomInRange(area.minY, area.maxY);
    spawnGracePickup(x, spawnY + randomInRange(-40, 40), {
      vx,
      vy,
      value: 1,
      life: Number.isFinite(life) ? life : undefined,
      useGravity: true,
      bounce: true,
      gravity: GRACE_PICKUP_GRAVITY * 1.9,
      floorY,
      bounceDamp: 0.55,
      airDrag: 0.985,
      disableAttraction: true,
      trackViewportXBounds: fullWidth,
      minX: minRainX,
      maxX: maxRainX,
    });
  }
}

function spawnVictoryGraceBurst(options = {}) {
  const {
    amount = 20,
    reason = "battle",
    centerX: overrideX = null,
    centerY: overrideY = null,
    life = null,
  } = options || {};
  const area = getPlayfieldBounds();
  const centerX =
    Number.isFinite(overrideX) ? overrideX : player ? player.x : (area.minX + area.maxX) / 2;
  const centerY =
    Number.isFinite(overrideY) ? overrideY : player ? player.y : (area.minY + area.maxY) / 2;
  const spread =
    reason === "boss"
      ? Math.max(area.maxX - area.minX, area.maxY - area.minY) * 0.6
      : Math.min(area.maxX - area.minX, area.maxY - area.minY) * 0.4;
  spawnGraceRainBurst(amount, {
    centerX,
    spread,
    life,
    fullWidth: reason === "boss",
  });
}

function maybeDropGraceFromEnemy(enemy) {
  if (!enemy || visitorSession?.active) return;
  const framesAvailable = assets?.items?.gracePickup?.frames;
  if (!framesAvailable || !framesAvailable.length) return;
  const baseHealth = Number.isFinite(enemy.maxHealth)
    ? enemy.maxHealth
    : Number.isFinite(enemy.config?.health)
      ? enemy.config.health
      : enemy.health;
  if (Number.isFinite(baseHealth) && baseHealth > 100) {
    const blocks = Math.max(1, Math.floor(baseHealth / 100));
    let guaranteed = 0;
    for (let i = 0; i < blocks; i += 1) {
      guaranteed += Math.floor(randomInRange(3, 6));
    }
    spawnGraceArcBurst(enemy.x, enemy.y, guaranteed);
    return;
  }
  let chance = GRACE_DROP_BASE_CHANCE;
  const referenceRadius = enemy.radius || enemy.config?.radius || 24;
  const sizeRatio = Math.max(0, referenceRadius - 24) / 48;
  chance += sizeRatio * GRACE_DROP_SIZE_CHANCE_FACTOR;
  const normalizedChance = Math.min(0.95, chance);
  chance = normalizedChance;
  const popcornTypes = new Set([
    "miniImp",
    "miniImpLevel2",
    "miniImpLevel3",
    "miniFireImp",
    "miniDemon",
    "miniDemoness",
  ]);
  if (popcornTypes.has(enemy.type)) {
    chance *= GRACE_DROP_MINION_SCALE;
  }
  if (Math.random() > chance) return;
  const stacks = 1 +
    Math.floor(Math.random() * GRACE_DROP_MAX_STACK) +
    Math.floor(sizeRatio * GRACE_DROP_SIZE_STACK_FACTOR * GRACE_DROP_MAX_STACK);
  spawnGraceArcBurst(enemy.x, enemy.y, stacks);
}

function updateGracePickups(dt) {
  if (!gracePickups.length) return;
  for (let i = gracePickups.length - 1; i >= 0; i -= 1) {
    const pickup = gracePickups[i];
    if (!pickup) continue;
    pickup.frameTimer += dt;
    pickup.bobTimer += dt * 3;
    if (pickup.spawnBlink > 0) pickup.spawnBlink = Math.max(0, pickup.spawnBlink - dt);
    while (pickup.frameTimer >= pickup.frameDuration) {
      pickup.frameTimer -= pickup.frameDuration;
      pickup.frameIndex = (pickup.frameIndex + 1) % pickup.frames.length;
    }
    if (pickup.useGravity && Number.isFinite(pickup.gravity)) {
      pickup.vy += pickup.gravity * dt;
    }
    const drag = Number.isFinite(pickup.airDrag) ? pickup.airDrag : GRACE_PICKUP_AIR_DRAG;
    pickup.vx *= drag;
    pickup.vy *= drag;
    pickup.x += pickup.vx * dt;
    pickup.y += pickup.vy * dt;
    if (pickup.bounce && Number.isFinite(pickup.floorY) && pickup.y >= pickup.floorY) {
      pickup.y = pickup.floorY;
      if (pickup.vy > 0) {
        pickup.vy = -pickup.vy * pickup.bounceDamp;
        pickup.vx *= 0.85;
        if (Math.abs(pickup.vy) < 40) {
          pickup.vy = 0;
          pickup.vx *= 0.6;
          pickup.grounded = true;
        }
      }
    }
    if (pickup.bounce) {
      const radius = pickup.radius || GRACE_PICKUP_RADIUS;
      let leftWall = Number.isFinite(pickup.minX) ? pickup.minX : radius;
      let rightWall = Number.isFinite(pickup.maxX) ? pickup.maxX : (canvas.width - radius);
      if (pickup.trackViewportXBounds) {
        const viewOffsetX = Number.isFinite(cameraOffsetX) ? cameraOffsetX : 0;
        leftWall = viewOffsetX;
        rightWall = viewOffsetX + canvas.width;
      }
      if (pickup.x <= leftWall && pickup.vx < 0) {
        pickup.x = leftWall;
        pickup.vx = -pickup.vx * pickup.bounceDamp;
      } else if (pickup.x >= rightWall && pickup.vx > 0) {
        pickup.x = rightWall;
        pickup.vx = -pickup.vx * pickup.bounceDamp;
      }
    }
    pickup.life -= dt;
    if (pickup.life <= 3) {
      pickup.blinkTimer = (pickup.blinkTimer || 0) + dt * 8;
      pickup.blinkAlpha = Math.sin(pickup.blinkTimer) > 0 ? 1 : 0.25;
    } else {
      pickup.blinkAlpha = 1;
    }
    if (player) {
      const dx = player.x - pickup.x;
      const dy = player.y - pickup.y;
      const distance = Math.hypot(dx, dy);
      if (false && distance < GRACE_PICKUP_ATTRACT_DISTANCE && player.state !== "death") {
        const attract = GRACE_PICKUP_ATTRACT_FORCE * (1 - distance / GRACE_PICKUP_ATTRACT_DISTANCE);
        pickup.vx += (dx / Math.max(distance, 0.001)) * attract * dt;
        pickup.vy += (dy / Math.max(distance, 0.001)) * attract * dt;
      }
      if (distance <= (player.radius || 24) + pickup.radius) {
        addGrace(pickup.value);
        if (typeof window !== "undefined" && typeof window.playGracePickupSfx === "function") {
          window.playGracePickupSfx(0.2);
        }
        spawnGraceHudFlyEffect(pickup);
        spawnImpactEffect(player.x, player.y - player.radius / 2);
        gracePickups.splice(i, 1);
        continue;
      }
    }
    if (pickup.life <= 0) {
      gracePickups.splice(i, 1);
    }
  }
}

function queueLevelAnnouncement(title, subtitle = "", durationOrOptions = 2.5, maybeOptions = undefined) {
  if (!title) return;
  let duration = 2.5;
  let options = {};
  if (typeof durationOrOptions === "number") {
    duration = durationOrOptions;
    if (maybeOptions && typeof maybeOptions === "object") options = maybeOptions;
  } else if (typeof durationOrOptions === "object" && durationOrOptions !== null) {
    options = durationOrOptions;
    if (typeof options.duration === "number") {
      duration = options.duration;
    }
  }
  const requiresConfirm = Boolean(options.requiresConfirm);
  const skipMissionBrief = Boolean(options.skipMissionBrief);
  const townIntro = Boolean(options.townIntro);
  const exteriorShot = Boolean(options.exteriorShot);
  const allowDuringSuppression = Boolean(options.allowDuringSuppression);
  if (suppressInitialAnnouncements && !allowDuringSuppression) return;
  const missionBriefTitle =
    typeof options.missionBriefTitle === "string" && options.missionBriefTitle.trim().length
      ? options.missionBriefTitle
      : null;
  const bossMissionBrief = Boolean(options.bossMissionBrief);
  const finalYear = Boolean(options.finalYear);
  const pastorFinal = Boolean(options.pastorFinal);
  const pastorPostRecap = Boolean(options.pastorPostRecap);
  const missionNumber = Number.isFinite(options.missionNumber) ? options.missionNumber : null;
  const upcomingMissionNumber = Number.isFinite(options.upcomingMissionNumber)
    ? options.upcomingMissionNumber
    : null;
  const upcomingOrderNumber = Number.isFinite(options.upcomingOrderNumber)
    ? options.upcomingOrderNumber
    : null;
  const pastorPostRecapDelay = Number.isFinite(options.pastorPostRecapDelay)
    ? Math.max(0, options.pastorPostRecapDelay)
    : 0;
  const pastorPostRecapUpgradeAfter = Boolean(options.pastorPostRecapUpgradeAfter);
  const levelSummary = Boolean(options.levelSummary);
  const fadeOutDuration = Number.isFinite(options.fadeOutDuration)
    ? Math.max(0.05, options.fadeOutDuration)
    : null;
  const showSubtitle = Boolean(options.showSubtitle);
  const eyebrowText =
    typeof options.eyebrowText === "string" && options.eyebrowText.trim().length
      ? options.eyebrowText.trim()
      : "";
  const announcement = {
    title,
    subtitle,
    eyebrowText,
    duration,
    timer: duration,
    requiresConfirm,
    skipMissionBrief,
    missionBriefTitle,
    townIntro,
    exteriorShot,
    bossMissionBrief,
    missionNumber,
    upcomingMissionNumber,
    upcomingOrderNumber,
    finalYear,
    levelSummary,
    fadeOutDuration,
    showSubtitle,
    pastorFinal,
    pastorPostRecap,
    pastorPostRecapDelay,
    pastorPostRecapUpgradeAfter,
  };
  if (
    missionBriefTitle &&
    !bossMissionBrief &&
    typeof subtitle === "string" &&
    subtitle.trim().length &&
    typeof window !== "undefined"
  ) {
    window.__lastMissionBriefScenario = subtitle.trim();
  }
  levelAnnouncements.push(announcement);
}

function updateLevelAnnouncements(dt) {
  for (let i = levelAnnouncements.length - 1; i >= 0; i -= 1) {
    const announcement = levelAnnouncements[i];
    if (announcement.exteriorShot) {
      announcement.timer -= dt;
      if (announcement.timer <= 0) {
        if (i === 0) {
          startTownIntroTransition();
          return;
        }
        levelAnnouncements.splice(i, 1);
      }
      continue;
    }
    if (announcement.requiresConfirm) continue;
    announcement.timer -= dt;
    if (announcement.timer <= 0) {
      levelAnnouncements.splice(i, 1);
    }
  }
}

function dismissCurrentLevelAnnouncement() {
  if (!levelAnnouncements.length) return;
  // Clear any pending prayer bomb input to prevent accidental activation after dismissal
  if (typeof Input !== "undefined" && "prayerBombClickQueued" in Input) {
    Input.prayerBombClickQueued = false;
  }
  const current = levelAnnouncements[0];
  if (!current.requiresConfirm) {
    levelAnnouncements.shift();
    return;
  }
  levelAnnouncements.shift();
  if (current.isVisitorSummary) {
    const reason = current.summaryReason || "summary";
    visitorSession.summaryReason = null;
    visitorSession.awaitingSummaryConfirm = false;
    completeVisitorSession(reason);
  }
  if (current.townIntro) {
    pendingTownIntroStart = true;
    townIntroDismissedAt =
      typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    suppressInitialAnnouncements = true;
    paused = false;
    const _townList = window.BattlechurchMapData?.towns;
    const _townIdx = _townList ? _townList.findIndex((t) => t.id === activeTownId) : -1;
    const _levelNum = _townIdx >= 0 ? _townIdx + 1 : 1;
    // Towns beyond the first skip the congregation screen in levels.js, so
    // suppressInitialAnnouncements would never be cleared — clear it now.
    if (_levelNum > 1) {
      suppressInitialAnnouncements = false;
      pendingTownIntroStart = false;
    }
    if (levelManager && typeof levelManager.beginFromTownIntro === "function") {
      levelManager.beginFromTownIntro(_levelNum);
    } else if (levelManager && typeof levelManager.begin === "function") {
      levelManager.begin();
    } else if (levelManager && typeof levelManager.startBriefing === "function") {
      levelManager.startBriefing(_levelNum);
    } else if (levelManager && typeof levelManager.advanceFromBriefing === "function") {
      levelManager.advanceFromBriefing(_levelNum);
    }
    if (Array.isArray(levelAnnouncements)) {
      levelAnnouncements.length = 0;
    }
  }
  if (levelManager?.acknowledgeAnnouncement) {
    try { levelManager.acknowledgeAnnouncement(); } catch (e) {}
  }
  if (levelManager?.getStatus && !current.townIntro && !current.exteriorShot) {
    try {
      const status = levelManager.getStatus();
      if (status?.stage === "levelIntro" && typeof levelManager.advanceFromCongregation === "function") {
        levelManager.advanceFromCongregation();
      }
    } catch (e) {}
  }
}

function isBattleSummaryAnnouncement(announcement) {
  if (!announcement || !announcement.title) return false;
  const lowerTitle = String(announcement.title).toLowerCase();
  return (
    lowerTitle.includes("cleared") ||
    lowerTitle.includes("horde") && lowerTitle.includes("cleared")
  );
}

function setDevStatus(text, duration = 2.5) {
  if (!text) {
    devStatus.text = "";
    devStatus.timer = 0;
    return;
  }
  devStatus.text = text;
  devStatus.timer = duration;
}

function updateDevStatus(dt) {
  if (devStatus.timer > 0) {
    devStatus.timer = Math.max(0, devStatus.timer - dt);
  }
}

function drawDevStatus() {
  // Developer status messages are intentionally not drawn in the HUD.
  // They can still be stored (devStatus) for programmatic checks but are hidden.
  return;
}

function drawNpcHomeBounds() {
  // Developer-only homebase border removed per request; keep function for potential future toggles.
  return;
}

function triggerHeroRescueCall() {
  if (heroRescueCooldown > 0 || !player) return;
  heroSay("I'll save you!");
  heroRescueCooldown = 2.5;
}

function applyEnemyTouchDamage(enemy) {
  if (!enemy || enemy.state === "death") return;
  if (enemy._orbiting) return;
  if (isEnemyInKnockback(enemy)) return;
  if ((enemy.touchCooldown || 0) > 0) return;
  if (
    enemy.state === "attack" &&
    Number.isFinite(enemy.config?.attackHitFrame) &&
    enemy.config.attackHitFrame > 0
  ) {
    return;
  }

  if (player && player.state !== "death") {
    const center = getEnemyHitboxCenter(enemy);
    const touchRadius = getEnemyHitboxRadius(enemy);
    if (circleIntersectsPlayerHurtbox(center.x, center.y, touchRadius, player)) {
      if (player.invulnerableTimer > 0) {
        enemy.touchCooldown = Math.max(enemy.touchCooldown || 0, 0.35);
        return;
      }
      if (player.shieldTimer > 0) {
        applyShieldImpact(enemy);
        enemy.touchCooldown = Math.max(enemy.touchCooldown || 0, 0.25);
        return;
      }
      enemy.touchCooldown = 1.4;
      return;
    }
  }

  if (Array.isArray(npcs) && npcs.length) {
    for (const npc of npcs) {
      if (!npc || npc.departed) continue;
      const center = getEnemyHitboxCenter(enemy);
      const dx = center.x - npc.x;
      const dy = center.y - npc.y;
      const distance = Math.hypot(dx, dy);
      const threshold = getEnemyHitboxRadius(enemy) + (npc.radius || 24);
      if (distance <= threshold) {
        enemy.touchCooldown = 1.2;
        return;
      }
    }
  }
}


function applyShieldImpact(target) {
  if (!player || player.shieldTimer <= 0) return false;
  if (!target || target.dead || target.state === "death") return false;
  const targetRadius = getEnemyHitboxRadius(target) || target.radius || 30;
  const center = getEnemyHitboxCenter(target);
  const dx = center.x - player.x;
  const dy = center.y - player.y;
  const distance = Math.hypot(dx, dy);
  const shieldReach = player.radius * 1.6 + targetRadius;
  if (distance > shieldReach) return false;

  const isLargeTarget = targetRadius >= SHIELD_LARGE_RADIUS_THRESHOLD;
  const damage = isLargeTarget ? SHIELD_LARGE_DAMAGE : SHIELD_SMALL_DAMAGE;
  if (isLargeTarget) {
    if ((target.shieldHitCooldown || 0) > 0) {
      if (typeof target.touchCooldown === "number") {
        target.touchCooldown = Math.max(target.touchCooldown, SHIELD_LARGE_COOLDOWN);
      }
      return true;
    }
    if (typeof target.takeDamage === "function") {
      target.takeDamage(damage);
    }
    target.shieldHitCooldown = SHIELD_LARGE_COOLDOWN;
  } else {
    if (typeof target.takeDamage === "function") {
      target.takeDamage(damage);
    }
    target.shieldHitCooldown = SHIELD_LARGE_COOLDOWN;
  }
  registerComboHit(target, damage);
  spawnFlashEffect(target.x, target.y - targetRadius / 2);
  if (typeof target.touchCooldown === "number") {
    target.touchCooldown = Math.max(target.touchCooldown, SHIELD_LARGE_COOLDOWN);
  }
  return true;
}

function detonateWisdomMissleProjectile(projectile) {
  let radius = MAGIC_SPLASH_RADIUS;
  if (projectile?.source?.isCozyNpc) {
    radius = MAGIC_SPLASH_RADIUS * 0.5;
  }
  const centerX = projectile.x;
  const centerY = projectile.y;
  if (typeof playWisdomHitSfx === "function") {
    playWisdomHitSfx(0.8);
  }
  const baseDamage = projectile.getDamage() * MAGIC_SPLASH_DAMAGE_MULTIPLIER;
  applyProjectileSplashDamage(projectile, centerX, centerY, radius, baseDamage, {
    skipBossImpact: true,
  });
  spawnMagicSplashEffect(centerX, centerY, radius);
  projectile.dead = true;
  applyCameraShake(WISDOM_HIT_SHAKE_DURATION, WISDOM_HIT_SHAKE_MAGNITUDE);
}

function detonateFaithCannonProjectile(projectile, { endOfRange = false } = {}) {
  if (!projectile || projectile.dead) return;
  let radius = FAITH_CANNON_SPLASH_RADIUS;
  if (projectile?.source?.isCozyNpc) {
    radius = FAITH_CANNON_SPLASH_RADIUS * 0.5;
  }
  const centerX = projectile.x;
  const centerY = projectile.y;
  if (typeof playFaithHitSfx === "function") {
    playFaithHitSfx(0.8);
  }
  const splashDamage = projectile.getDamage() * FAITH_CANNON_SPLASH_DAMAGE_MULTIPLIER;
  applyProjectileSplashDamage(projectile, centerX, centerY, radius, splashDamage, {
    skipBossImpact: true,
  });
  if (endOfRange) {
    spawnImpactDustEffect(centerX, centerY);
  } else {
    spawnPuffEffect(centerX, centerY);
  }
  projectile.dead = true;
  applyCameraShake(FAITH_HIT_SHAKE_DURATION, FAITH_HIT_SHAKE_MAGNITUDE);
}

function updateAimAssist() {
  aimAssist.target = null;
  aimAssist.targetKind = null;
  aimAssist.vertices = null;
  if (!player || aimState.usingPointer) return;

  const dir = player.getAimDirection();
  if (!dir.x && !dir.y) return;

  const forward = dir;
  const length = AIM_ASSIST_LENGTH;
  const halfFov = AIM_ASSIST_FOV / 2;
  const cosThreshold = Math.cos(halfFov);

  const origin = { x: player.x, y: player.y };
  const leftDir = rotateVector(forward, halfFov);
  const rightDir = rotateVector(forward, -halfFov);
  aimAssist.vertices = {
    origin,
    left: { x: origin.x + leftDir.x * length, y: origin.y + leftDir.y * length },
    right: { x: origin.x + rightDir.x * length, y: origin.y + rightDir.y * length },
  };

  const candidates = [];
  enemies.forEach((enemy) => {
    if (!isEnemyTargetableForAutoAim(enemy)) return;
    candidates.push({ entity: enemy, kind: "enemy" });
  });
  projectiles.forEach((projectile) => {
    if (!projectile || projectile.dead || projectile.friendly) return;
    candidates.push({ entity: projectile, kind: "projectile" });
  });
  // NPCs are intentionally excluded from aim-assist candidates to keep
  // player aim under direct control and avoid auto-targeting friendly NPCs.

  const priorityForKind = (kind) => {
    if (kind === "npc") return 0;
    if (kind === "projectile") return 0;
    return 1;
  };

  let bestCandidate = null;
  let bestPriority = Infinity;
  let bestDistance = Infinity;
  candidates.forEach(({ entity, kind }) => {
    const center = kind === "enemy" ? getEnemyHitboxCenter(entity) : { x: entity.x, y: entity.y };
    const vx = center.x - origin.x;
    const vy = center.y - origin.y;
    const distance = Math.hypot(vx, vy);
    if (!distance || distance > length) return;
    const cosAngle = (vx * forward.x + vy * forward.y) / distance;
    if (cosAngle < cosThreshold) return;
    const priority = priorityForKind(kind);
    if (priority < bestPriority || (priority === bestPriority && distance < bestDistance)) {
      bestPriority = priority;
      bestDistance = distance;
      bestCandidate = { entity, kind };
    }
  });

  if (bestCandidate) {
    aimAssist.target = bestCandidate.entity;
    aimAssist.targetKind = bestCandidate.kind;
  }
}

function clampEntityToBounds(entity) {
  const radius = Math.max(entity.radius || 0, 0);
  if (entity?.spawnOffscreenTimer > 0) return;
  if (entity?.ignoreWorldBounds) return;
  const offset = getEntityCollisionOffset(entity);
  const centerX = (entity?.x || 0) + offset.x;
  const centerY = (entity?.y || 0) + offset.y;
  const lateralMargin = Math.max(radius, 16);
  const verticalMargin = Math.max(radius, 16);
  const clampedX = Math.max(lateralMargin, Math.min(canvas.width - lateralMargin, centerX));
  entity.x = clampedX - offset.x;
  // Reduce the default top padding so the playable area's upper boundary moves
  // up and the player can get closer to the HUD. Use a smaller radius-based
  // multiplier and a low absolute minimum to avoid clipping into HUD.
  const defaultTopPadding = Math.max(verticalMargin, Math.floor(radius * 2), 8);
  const topPadding =
    typeof entity.safeTopMargin === "number"
      ? Math.max(entity.safeTopMargin, verticalMargin)
      : defaultTopPadding;
  // Strict top limit: do not allow entities above the HUD line. Keep a
  // consistent top padding so entities don't clip into HUD elements.
  const topLimit = HUD_HEIGHT + topPadding;
  const bottomLimit = canvas.height - verticalMargin;
  const clampedY = Math.max(topLimit, Math.min(bottomLimit, centerY));
  entity.y = clampedY - offset.y;
}

function resolveEntityObstacles(entity) {
  if (entity?.spawnOffscreenTimer > 0) return;
  if (!entity || entity?.ignoreWorldBounds) return;
  if (entity?.ignoreObstacles) return;
  const hasStaticObstacles = obstacles.length > 0;
  if (!hasStaticObstacles) return;
  const offset = getEntityCollisionOffset(entity);
  const maxIterations = 5;
  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let adjusted = false;
    if (hasStaticObstacles) {
      for (const obstacle of obstacles) {
        const centerX = (entity.x || 0) + offset.x;
        const centerY = (entity.y || 0) + offset.y;
        const dx = centerX - obstacle.x;
        const dy = centerY - obstacle.y;
        const distance = Math.hypot(dx, dy);
        const minDistance = (entity.radius || 0) + obstacle.collisionRadius;
        if (distance < minDistance && minDistance > 0) {
          const overlap = minDistance - (distance || 0);
          const nx = distance === 0 ? 1 : dx / distance;
          const ny = distance === 0 ? 0 : dy / distance;
          entity.x += nx * overlap;
          entity.y += ny * overlap;
          adjusted = true;
          console.debug &&
            console.debug("ObstacleAdjust", {
              type: entity?.type,
              dx,
              dy,
              entityX: entity.x,
              entityY: entity.y,
              obstacleX: obstacle.x,
              obstacleY: obstacle.y,
            });
        }
      }
    }
    if (!adjusted) break;
  }
}

function resolveEntityCollisions(entity, targets, { allowPush = true, overlapScale = 1 } = {}) {
  if (!targets?.length) return;
  if (!entity || entity?.spawnOffscreenTimer > 0) return;
  if (!entity || entity?.ignoreWorldBounds) return;
  if (entity?.ignoreEntityCollisions) return;
  const hasMiniBehavior = (ent) => {
    if (!ent) return false;
    const type = typeof ent.type === "string" ? ent.type.toLowerCase() : "";
    return type.startsWith("mini");
  };
  const getSwarmSpacing = (ent) => {
    if (!ent || !ent.config) return 1;
    const val = ent.config.swarmSpacing;
    if (Number.isFinite(val) && val > 0) {
      if (val <= 1) return Math.max(0.1, val * 0.4);
      return Math.max(0.25, Math.min(2, val));
    }
    return 1;
  };
  const isMiniImp = (ent) => {
    const type = typeof ent?.type === "string" ? ent.type : "";
    return type === "miniImp" || type === "miniImpLevel2" || type === "miniImpLevel3";
  };
  for (const other of targets) {
    if (other === entity) continue;
    if (other.dead || other.state === "death") continue;
    if (other?.spawnOffscreenTimer > 0) continue;
    if (other?.ignoreWorldBounds) continue;
    if (other?.ignoreEntityCollisions) continue;
    if (other?.spawnOffscreenTimer > 0) continue;
    const bothEnemies = isEnemyEntity(entity) && isEnemyEntity(other);
    if (bothEnemies) {
      const entityIsMini = hasMiniBehavior(entity);
      const otherIsMini = hasMiniBehavior(other);
      const entityIsMiniImp = isMiniImp(entity);
      const otherIsMiniImp = isMiniImp(other);
      if (entity.isPlayer || entity.isCozyNpc || other.isPlayer || other.isCozyNpc) {
        // keep default behavior for players/NPCs
      } else if (entityIsMiniImp && otherIsMini && !otherIsMiniImp) {
        continue;
      } else if (otherIsMiniImp && entityIsMini && !entityIsMiniImp) {
        continue;
      }
    if (entityIsMini !== otherIsMini) {
      continue;
    }
  }
    const entityCenter = getEntityCollisionCenter(entity);
    const otherCenter = getEntityCollisionCenter(other);
    const dx = entityCenter.x - otherCenter.x;
    const dy = entityCenter.y - otherCenter.y;
    const distance = Math.hypot(dx, dy);
    const baseRadius = (entity.radius || 0) + (other.radius || 0);
    let spacingFactor = 1;
    if (bothEnemies && entity.type === other.type) {
      spacingFactor = Math.min(getSwarmSpacing(entity), getSwarmSpacing(other));
    }
    const minDistance = baseRadius * overlapScale * spacingFactor;
    if (distance > 0 && distance < minDistance) {
      const overlap = minDistance - distance;
      const nx = dx / distance;
      const ny = dy / distance;
      if (allowPush) {
        const pushFactor = 0.5;
        const pullFactor = 0.5;
        const entityGrace = Boolean(entity.spawnPushGrace && entity.spawnPushGrace > 0);
        const otherGrace = Boolean(other.spawnPushGrace && other.spawnPushGrace > 0);
        if (entityGrace && !otherGrace) {
          entity.x += nx * (overlap * pushFactor);
          entity.y += ny * (overlap * pushFactor);
        } else if (otherGrace && !entityGrace) {
          other.x -= nx * (overlap * pullFactor);
          other.y -= ny * (overlap * pullFactor);
        } else {
          entity.x += nx * (overlap * pushFactor);
          entity.y += ny * (overlap * pushFactor);
          other.x -= nx * (overlap * pullFactor);
          other.y -= ny * (overlap * pullFactor);
        }
      } else {
        entity.x += nx * overlap;
        entity.y += ny * overlap;
      }
    }
  }
}

function devClearOpponents({ includeBoss = false } = {}) {
  enemies.forEach((enemy) => {
    if (!enemy || enemy.dead || enemy.state === "death") return;
    if (typeof enemy.takeDamage === "function") {
      enemy.takeDamage(enemy.health + (enemy.maxHealth || 0) + 9999);
    } else {
      enemy.dead = true;
      enemy.state = "death";
    }
  });
  if (includeBoss && activeBoss && typeof activeBoss.takeDamage === "function") {
    activeBoss.takeDamage(activeBoss.health + (activeBoss.maxHealth || 0) + 9999);
  }
  bossHazards.length = 0;
}

function computeObstacleAvoidance(entity) {
  const hasStaticObstacles = obstacles.length > 0;
  if (!hasStaticObstacles) return { x: 0, y: 0 };
  let steerX = 0;
  let steerY = 0;
  const applyObstacle = (ox, oy, radius) => {
    if (!radius || radius <= 0) return;
    const center = getEntityCollisionCenter(entity);
    const dx = center.x - ox;
    const dy = center.y - oy;
    const distance = Math.hypot(dx, dy);
    if (distance === 0) return;
    const buffer = 12;
    const safeDistance = (entity.radius || 0) + radius + buffer;
    if (distance < safeDistance) {
      const influence = (safeDistance - distance) / Math.max(safeDistance, 1);
      steerX += (dx / distance) * influence;
      steerY += (dy / distance) * influence;
    }
  };
  if (hasStaticObstacles) {
    for (const obstacle of obstacles) {
      applyObstacle(obstacle.x, obstacle.y, obstacle.collisionRadius);
    }
  }
  return { x: steerX, y: steerY };
}

function canSpawnWisdomMissleProjectile() {
  const maxShots = player ? player.wisdomMissleShotsMax : 1;
  const activeShots = projectiles.reduce(
    (count, projectile) => count + (projectile.type === "wisdom_missle" ? 1 : 0),
    0,
  );
  return activeShots < maxShots;
}

function canSpawnFaithCannonProjectile() {
  const maxShots = player ? player.faithCannonShotsMax : 1;
  const activeShots = projectiles.reduce(
    (count, projectile) => count + (projectile.type === "faith_cannon" ? 1 : 0),
    0,
  );
  return activeShots < maxShots;
}

function canSpawnFireProjectile() {
  const maxShots = player ? player.fireShotsMax : 2;
  const activeShots = projectiles.reduce(
    (count, projectile) => count + (projectile.type === "fire" ? 1 : 0),
    0,
  );
  return activeShots < maxShots;
}

function updateAimFromKeyboard() {
  const gamepadAim = Input?.gamepadState?.aim;
  if (gamepadAim?.active) {
    aimState.x = gamepadAim.x;
    aimState.y = gamepadAim.y;
    aimState.usingPointer = false;
    aimState.triggerPress = true;
    pointerState.active = false;
    if (player) {
      player.aim = { x: gamepadAim.x, y: gamepadAim.y };
      player.updateFacing(gamepadAim.x, gamepadAim.y);
    }
    return;
  }

  aimState.triggerPress = false;
  const aimX = (isActionActive("aimRight") ? 1 : 0) - (isActionActive("aimLeft") ? 1 : 0);
  const aimY = (isActionActive("aimDown") ? 1 : 0) - (isActionActive("aimUp") ? 1 : 0);
  if (aimX === 0 && aimY === 0) {
    return;
  }

  const { x, y } = normalizeVector(aimX, aimY);
  aimState.x = x;
  aimState.y = y;
  aimState.usingPointer = false;
  pointerState.active = false;
  aimState.triggerPress = true;
  if (player) {
    player.aim = { x, y };
    player.updateFacing(x, y);
  }
}
function createPlayerInstance(x, y, clips) {
  const factory = window.Entities?.createPlayer;
  if (typeof factory === 'function') return factory(x, y, clips);
  const PlayerClass = window.Entities?.Player;
  if (typeof PlayerClass === 'function') return new PlayerClass(x, y, clips);
  throw new Error('Player factory unavailable');
}


function createEnemyInstance(type, config, clips, x, y) {
  const factory = window.Entities?.createEnemy;
  if (typeof factory === "function") return factory(type, config, clips, x, y);
  const EnemyClass = window.Entities?.Enemy;
  if (typeof EnemyClass === "function") return new EnemyClass(type, config, clips, x, y);
  throw new Error('Enemy factory unavailable');
}

function shouldEnemyHuntNpcs(type, config = {}) {
  if (
    Array.isArray(config.specialBehavior) &&
    (config.specialBehavior.includes("npcPriority") || config.specialBehavior.includes("closestAny"))
  ) {
    return true;
  }
  if (type === "skeleton") return true;
  if (config.projectileType === "arrow") return true;
  return false;
}

function drawPickupLabel(context, text, x, y, color = "#EAF6FF") {
  if (!context || !text) return;
  context.save();
  context.font = `12px ${UI_FONT_FAMILY}`;
  context.textAlign = "center";
  context.textBaseline = "bottom";
  context.lineWidth = 3;
  context.strokeStyle = "rgba(0, 0, 0, 0.75)";
  context.fillStyle = color;
  context.strokeText(text, x, y);
  context.fillText(text, x, y);
  context.restore();
}

const POWERUP_ICON_STYLES = {
  player: { shape: "square", color: "#2B4C73", accent: "#3C5F8C" },
  npc: { shape: "square", color: "#C14C4C", accent: "#E06A6A" },
  utility: { shape: "circle", color: "#B7742A", accent: "#D08D42" },
};
const POWERUP_ICON_OUTLINE = "rgba(10, 15, 31, 0.7)";
const POWERUP_ICON_HIGHLIGHT = "rgba(255, 215, 64, 0.95)";
const POWERUP_ICON_TEXT_COLOR = "#EAF6FF";

function resolvePowerupIconCategory(effect = "") {
  if (String(effect).startsWith("npc")) return "npc";
  if (WEAPON_POWERUP_EFFECTS.has(effect)) return "player";
  if (CHURCH_POWERUP_EFFECTS.has(effect)) return "player";
  return "utility";
}

function splitPowerupLabel(text) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  if (words.length === 1) return [words[0]];
  if (words.length === 2) return [words[0], words[1]];
  if (words.length === 3) return [`${words[0]} ${words[1]}`, words[2]];
  if (words.length === 4) return [`${words[0]} ${words[1]}`, `${words[2]} ${words[3]}`];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

function drawPowerupIcon(context, { x, y, size, shape, color, accent, text, iconImage }) {
  if (!context) return;
  const half = size / 2;
  context.save();
  context.translate(x, y);
  context.globalAlpha *= 0.8;
  const gradient = context.createLinearGradient(0, -half, 0, half);
  gradient.addColorStop(0, accent || color);
  gradient.addColorStop(1, color);
  context.fillStyle = gradient;
  if (shape === "circle") {
    context.beginPath();
    context.arc(0, 0, half, 0, Math.PI * 2);
    context.fill();
    context.lineWidth = Math.max(2, size * 0.08);
    context.strokeStyle = POWERUP_ICON_HIGHLIGHT;
    context.stroke();
  } else {
    const radius = Math.max(6, Math.round(size * 0.16));
    roundRect(context, -half, -half, size, size, radius, true, false);
    context.lineWidth = Math.max(2, size * 0.08);
    context.strokeStyle = POWERUP_ICON_HIGHLIGHT;
    roundRect(context, -half, -half, size, size, radius, false, true);
  }

  const t = (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001;
  const pulse = (Math.sin(t * 1.6) + 1) * 0.5;
  const shimmerAlpha = Math.max(0.12, pulse * 0.65);
  if (shimmerAlpha > 0.12) {
    context.save();
    context.globalAlpha *= shimmerAlpha;
    context.beginPath();
    if (shape === "circle") {
      context.arc(0, 0, half, 0, Math.PI * 2);
    } else {
      const radius = Math.max(6, Math.round(size * 0.16));
      roundRect(context, -half, -half, size, size, radius, false, false);
    }
    context.clip();
    const shimmerWidth = size * 0.6;
    const offset = ((t * 0.9) % 1) * (size + shimmerWidth) - (size + shimmerWidth) / 2;
    context.rotate(-0.45);
    const grad = context.createLinearGradient(offset - shimmerWidth, 0, offset + shimmerWidth, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.85)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = grad;
    context.fillRect(-size * 1.5, -size * 1.5, size * 3, size * 3);
    context.restore();
  }

  if (iconImage) {
    const iconSize = size * 0.6;
    const iconX = -iconSize / 2;
    const iconY = -iconSize / 2;
    context.save();
    context.globalAlpha *= 0.9;
    context.drawImage(iconImage, iconX, iconY, iconSize, iconSize);
    context.restore();
  }

  const lines = iconImage ? [] : splitPowerupLabel(text);
  if (lines.length) {
    const maxWidth = size * 0.82;
    let fontSize = Math.round(size * 0.22);
    context.fillStyle = POWERUP_ICON_TEXT_COLOR;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.shadowColor = "transparent";
    context.shadowBlur = 0;
    context.shadowOffsetY = 0;
    const fitText = () => {
      context.font = `800 ${fontSize}px ${UI_FONT_FAMILY}`;
      return lines.every((line) => context.measureText(line).width <= maxWidth);
    };
    while (fontSize > 8 && !fitText()) {
      fontSize -= 1;
    }
    context.font = `800 ${fontSize}px ${UI_FONT_FAMILY}`;
    const lineHeight = Math.round(fontSize * 0.92);
    const totalHeight = lineHeight * lines.length;
    const startY = -totalHeight / 2 + lineHeight / 2;
    lines.forEach((line, idx) => {
      context.fillText(line, 0, startY + idx * lineHeight);
    });
  }
  context.restore();
}

function drawPowerupShadow(context, x, y, size, heightOffset = 0) {
  if (!context) return;
  const clampedOffset = Math.max(0, Math.min(16, Math.abs(heightOffset)));
  const scale = Math.max(0.72, 1 - clampedOffset * 0.02);
  const shadowWidth = size * 0.85 * scale;
  const shadowHeight = Math.max(6, size * 0.22 * scale);
  const shadowY = y + size * 0.5;
  context.save();
  context.fillStyle = "rgba(0, 0, 0, 0.45)";
  context.beginPath();
  if (typeof context.ellipse === "function") {
    context.ellipse(x, shadowY, shadowWidth / 2, shadowHeight / 2, 0, 0, Math.PI * 2);
  } else {
    context.translate(x, shadowY);
    context.scale(shadowWidth / 2, shadowHeight / 2);
    context.arc(0, 0, 1, 0, Math.PI * 2);
  }
  context.fill();
  context.restore();
}

class WeaponPickup {
  constructor(definition) {
    this.type = definition.type;
    this.definition = definition;
    this.frames =
      Array.isArray(definition.frames) && definition.frames.length ? definition.frames.slice() : null;
    this.frameRate = typeof definition.frameRate === "number" ? definition.frameRate : 0;
    this.frameIndex = 0;
    this.frameTimer = 0;
    this.image = this.frames ? this.frames[0] : definition.image;
    this.scale = definition.scale;
    this.radius = definition.radius;
    this.effect = definition.effect;
    if (typeof definition.speed === "number") {
      this.speed = Math.max(0, definition.speed);
    } else {
      const baseMin = typeof definition.speedMin === "number" ? definition.speedMin : 40;
      const baseMax = typeof definition.speedMax === "number" ? definition.speedMax : 85;
      const span = Math.max(0, baseMax - baseMin);
      this.speed = Math.max(0, baseMin + Math.random() * span);
    }
    this.speed *= SPEED_SCALE;
    this.direction = Math.random() * Math.PI * 2;
    this.turnTimer = this.speed > 0 ? 1 + Math.random() * 3 : Infinity;
    const initialSprite = this.frames ? this.frames[this.frameIndex] : this.image;
    const spriteWidth = initialSprite ? initialSprite.width : this.image.width;
    const spriteHeight = initialSprite ? initialSprite.height : this.image.height;
    this.width = spriteWidth * this.scale;
    this.height = spriteHeight * this.scale;
    this.x = Math.random() * (canvas.width - 200) + 100;
    this.y = Math.random() * (canvas.height - 200) + 100;
    const pushed = pushPointOutsideNpcHome(this.x, this.y);
    this.x = pushed.x;
    this.y = pushed.y;
    this.baseY = this.y;
    this.floatTimer = 0;
    this.active = true;
    this.life =
      typeof definition.life === "number" && Number.isFinite(definition.life)
        ? definition.life
        : POWERUP_ACTIVE_LIFETIME;
    this.blinkWindow = Math.min(
      Math.max(0, typeof definition.blinkDuration === "number" ? definition.blinkDuration : POWERUP_BLINK_DURATION),
      this.life,
    );
    this.blinkTimer = 0;
    this.spawnBlinkTimer = POWERUP_SPAWN_BLINK_DURATION;
    this.visible = true;
    this.expired = false;
    this.safeTopMargin = Math.max(this.height / 2, this.radius * 3, 150);
    clampEntityToBounds(this);
  }

  update(dt) {
    if (!this.active) return;
    if (this.frames && this.frameRate > 0 && this.frames.length > 1) {
      const frameDuration = 1 / this.frameRate;
      this.frameTimer += dt;
      while (this.frameTimer >= frameDuration) {
        this.frameTimer -= frameDuration;
        this.frameIndex = (this.frameIndex + 1) % this.frames.length;
        this.image = this.frames[this.frameIndex];
      }
    }

    if (this.speed > 0) {
      this.turnTimer -= dt;
      if (this.turnTimer <= 0) {
        this.direction = Math.random() * Math.PI * 2;
        this.turnTimer = 1 + Math.random() * 3;
      }
      this.x += Math.cos(this.direction) * this.speed * dt;
      this.y += Math.sin(this.direction) * this.speed * dt;
      this.baseY = this.y;
    }
    if (this.speed <= 0) {
      this.floatTimer += dt * 2;
      this.y = this.baseY + Math.sin(this.floatTimer) * 6 - 10;
    }
    resolveEntityObstacles(this);
    clampEntityToBounds(this);

    this.life -= dt;
    const exiting = this.life <= this.blinkWindow;
    if (this.spawnBlinkTimer > 0) {
      this.spawnBlinkTimer = Math.max(0, this.spawnBlinkTimer - dt);
    }
    if (exiting) {
      this.blinkTimer += dt * 10;
      this.visible = Math.floor(this.blinkTimer) % 2 === 0;
    } else {
      this.visible = true;
    }
    if (this.life <= 0) {
      this.expired = true;
      this.active = false;
      this.visible = false;
    }
  }

  draw() {
    if (!this.active || !this.visible) return;
    const styleKey = resolvePowerupIconCategory(this.effect);
    const style = POWERUP_ICON_STYLES[styleKey] || POWERUP_ICON_STYLES.utility;
    const size = Math.max(44, (this.radius || 24) * 2);
    const shadowY = Number.isFinite(this.baseY) ? this.baseY : this.y;
    const offset = Number.isFinite(this.baseY) ? this.y - this.baseY : 0;
    drawPowerupShadow(ctx, this.x, shadowY, size, offset);
    drawPowerupIcon(ctx, {
      x: this.x,
      y: this.y,
      size,
      shape: style.shape,
      color: style.color,
      accent: style.accent,
      text: this.definition?.label || "",
      iconImage: this.definition?.iconImage || null,
    });
  }
}

class UtilityPowerUp {
  constructor(definition, x, y) {
    // Uses the same glow logic as weapon power-ups for visual consistency.
    this.type = definition.type;
    this.definition = definition;
    this.image = definition.image;
    this.scale =
      Number.isFinite(definition.scale) && definition.scale > 0
        ? definition.scale
        : 1;
    const srcHint =
      definition.src ||
      (definition.image && typeof definition.image.src === "string"
        ? definition.image.src
        : "");
    const explicitMaxHeight =
      typeof definition.maxHeight === "number" ? definition.maxHeight : undefined;
    const inferredMaxHeight =
      explicitMaxHeight ??
      (srcHint.includes("/conrad/") ? CONRAD_UTILITY_POWERUP_MAX_HEIGHT : undefined);
    if (
      this.image &&
      inferredMaxHeight &&
      this.image.height > 0
    ) {
      const derivedMaxScale = Math.max(0.01, inferredMaxHeight / this.image.height);
      this.scale = Math.min(this.scale, derivedMaxScale);
    }
    this.radius = definition.radius;
    this.duration = definition.duration;
    this.label = definition.label;
    this.color = definition.color;
    this.x = x;
    this.y = y;
    this.floatTimer = 0;
    this.active = true;
    this.life =
      typeof definition.life === "number" && Number.isFinite(definition.life)
        ? definition.life
        : POWERUP_ACTIVE_LIFETIME;
    this.blinkWindow = Math.min(
      Math.max(0, typeof definition.blinkDuration === "number" ? definition.blinkDuration : POWERUP_BLINK_DURATION),
      this.life,
    );
    this.blinkTimer = 0;
    this.spawnBlinkTimer = POWERUP_SPAWN_BLINK_DURATION;
    this.visible = true;
    this.expired = false;
    this.safeTopMargin = Math.max((this.radius || 0) * 2.5, 140);
    const minY = HUD_HEIGHT + this.safeTopMargin;
    if (this.y < minY) {
      this.y = minY;
    }
    this.baseY = this.y;
  }

  update(dt) {
    if (!this.active) return;
    this.floatTimer += dt * 2;
    this.y = this.baseY + Math.sin(this.floatTimer) * 6 - 10;
    this.life -= dt;
    const exiting = this.life <= this.blinkWindow;
    if (this.spawnBlinkTimer > 0) {
      this.spawnBlinkTimer = Math.max(0, this.spawnBlinkTimer - dt);
    }
    if (exiting) {
      this.blinkTimer += dt * 10;
      this.visible = Math.floor(this.blinkTimer) % 2 === 0;
    } else {
      this.visible = true;
    }
    if (this.life <= 0) {
      this.expired = true;
      this.active = false;
      this.visible = false;
    }
  }

  draw(context) {
    if (!this.active || !this.visible) return;
    const style = POWERUP_ICON_STYLES.utility;
    const size = Math.max(44, (this.radius || 24) * 2);
    const shadowY = Number.isFinite(this.baseY) ? this.baseY : this.y;
    const offset = Number.isFinite(this.baseY) ? this.y - this.baseY : 0;
    drawPowerupShadow(context, this.x, shadowY, size, offset);
    drawPowerupIcon(context, {
      x: this.x,
      y: this.y,
      size,
      shape: style.shape,
      color: style.color,
      accent: style.accent,
      text: this.label || this.definition?.label || "",
      iconImage: this.definition?.iconImage || null,
    });
  }

  hitTest(entity) {
    const dx = entity.x - this.x;
    const dy = entity.y - this.y;
    const distance = Math.hypot(dx, dy);
    return distance <= (entity.radius || 0) + (this.radius || 0);
  }
}

class BossHazard {
  constructor(x, y, radius, duration, { damage = 1, tickInterval = 0.6 } = {}) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.damage = damage;
    this.life = duration;
    this.tickInterval = tickInterval;
    this.tickTimer = 0;
    this.dead = false;
  }

  update(dt) {
    if (this.dead) return;
    this.life -= dt;
    this.tickTimer -= dt;
    if (this.tickTimer <= 0) {
      this.tickTimer += this.tickInterval;
      this.applyDamage();
    }
    if (this.life <= 0) {
      this.dead = true;
    }
  }

  applyDamage() {
    if (!player || player.state === "death") return;
    if (circleIntersectsPlayerHurtbox(this.x, this.y, this.radius, player)) {
      if (player.invulnerableTimer > 0) {
        return;
      }
      if (player.shieldTimer > 0) {
        spawnFlashEffect(player.x, player.y - player.radius / 2);
      } else {
        player.takeDamage(this.damage);
        spawnFlashEffect(player.x, player.y - player.radius / 2);
      }
    }
  }

  draw(context) {
    if (this.dead) return;
    const alpha = Math.max(0.2, Math.min(0.85, this.life));
    const gradient = context.createRadialGradient(this.x, this.y, this.radius * 0.1, this.x, this.y, this.radius);
    gradient.addColorStop(0, `rgba(255, 120, 80, ${alpha})`);
    gradient.addColorStop(0.45, `rgba(255, 80, 40, ${alpha * 0.65})`);
    gradient.addColorStop(1, `rgba(120, 20, 10, 0)`);
    context.save();
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    context.fill();
    context.restore();
    context.save();
    context.strokeStyle = `rgba(255, 160, 120, ${alpha})`;
    context.lineWidth = 3;
    context.setLineDash([8, 6]);
    context.beginPath();
    context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }
}

function updateBossHazards(dt) {
  for (let i = bossHazards.length - 1; i >= 0; i -= 1) {
    const hazard = bossHazards[i];
    hazard.update(dt);
    if (hazard.dead) bossHazards.splice(i, 1);
  }
}

class CozyNpcAnimator {
  constructor({ animations = {}, shadow = null, scale = NPC_SCALE } = {}) {
    this.animations = animations;
    this.shadow = shadow || null;
    this.scale = scale;
    this.frameWidth = NPC_FRAME_WIDTH;
    this.frameHeight = NPC_FRAME_HEIGHT;
    this.currentState = animations.walk ? "walk" : Object.keys(animations)[0] || null;
    this.stateData = this.currentState ? animations[this.currentState] : null;
    this.frameTimer = 0;
    this.frameIndex = 0;
    this.direction = "down";
    this.moving = false;
  }

  setState(state, { restart = false } = {}) {
    if (!this.animations[state]) return;
    if (!restart && this.currentState === state) return;
    this.currentState = state;
    this.stateData = this.animations[state];
    this.frameTimer = 0;
    this.frameIndex = 0;
  }

  getState() {
    return this.currentState;
  }

  setDirectionFromVector(dx, dy) {
    if (!dx && !dy) return;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (absX > absY) {
      this.direction = dx >= 0 ? "right" : "left";
    } else {
      this.direction = dy >= 0 ? "down" : "up";
    }
  }

  setMoving(moving) {
    if (this.moving === moving) return;
    this.moving = moving;
    if (!moving) {
      this.frameIndex = 0;
      this.frameTimer = 0;
    }
  }

  update(dt) {
    const data = this.stateData;
    if (!data) return;
    const framesPerDirection = Math.max(1, data.framesPerDirection || 1);
    const animateWhenIdle = Boolean(data.animateWhenIdle);
    if (framesPerDirection <= 1) return;
    if (!this.moving && !animateWhenIdle) return;
    const frameDuration = data.frameDuration || NPC_WALK_FRAME_DURATION;
    this.frameTimer += dt;
    while (this.frameTimer >= frameDuration) {
      this.frameTimer -= frameDuration;
      this.frameIndex = (this.frameIndex + 1) % framesPerDirection;
    }
  }

  draw(context, x, y, options = {}) {
    const { flashWhite = 0, alpha = 1 } = options || {};
    const outerAlpha = context.globalAlpha;
    const data = this.stateData;
    if (!data || !data.layers || !data.layers.length) return;
    const framesPerDirection = Math.max(1, data.framesPerDirection || 1);
    if (framesPerDirection <= 0) return;
    if (this.frameIndex >= framesPerDirection) this.frameIndex = 0;
    const rowIndex = NPC_DIRECTION_ROW_MAP[this.direction] ?? 0;
    const sx = this.frameIndex * this.frameWidth;
    const sy = rowIndex * this.frameHeight;
    const drawWidth = this.frameWidth * this.scale;
    const drawHeight = this.frameHeight * this.scale;

    if (this.shadow) {
      const shadowWidth = this.shadow.width * this.scale;
      const shadowHeight = this.shadow.height * this.scale * 0.8;
      context.save();
      context.globalAlpha = outerAlpha * 0.35 * alpha;
      context.drawImage(
        this.shadow,
        x - shadowWidth / 2,
        y + drawHeight / 2 - shadowHeight * 0.6,
        shadowWidth,
        shadowHeight,
      );
      context.restore();
    }

    context.save();
    context.globalAlpha = outerAlpha * alpha;
    context.translate(x, y);
    data.layers.forEach((image) => {
      const source = image && image.__sourceImage ? image.__sourceImage : image;
      const offsetX = image && typeof image.__frameOffsetX === "number" ? image.__frameOffsetX : 0;
      const offsetY = image && typeof image.__frameOffsetY === "number" ? image.__frameOffsetY : 0;
      context.drawImage(
        source,
        sx + offsetX,
        sy + offsetY,
        this.frameWidth,
        this.frameHeight,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight,
      );
    });
    const flashAmount = Math.max(0, Math.min(1, flashWhite * DAMAGE_FLASH_INTENSITY));
    if (flashAmount > 0) {
      const prevComposite = context.globalCompositeOperation;
      const prevAlpha = context.globalAlpha;
      const prevFilter = context.filter || 'none';
      context.globalCompositeOperation = 'lighter';
      context.globalAlpha = outerAlpha * flashAmount * alpha;
      context.filter = `brightness(${(1 + flashAmount * 1.4).toFixed(2)}) saturate(${(1 + flashAmount * 0.9).toFixed(2)})`;
      data.layers.forEach((image) => {
        const source = image && image.__sourceImage ? image.__sourceImage : image;
        const offsetX = image && typeof image.__frameOffsetX === "number" ? image.__frameOffsetX : 0;
        const offsetY = image && typeof image.__frameOffsetY === "number" ? image.__frameOffsetY : 0;
        context.drawImage(
          source,
          sx + offsetX,
          sy + offsetY,
          this.frameWidth,
          this.frameHeight,
          -drawWidth / 2,
          -drawHeight / 2,
          drawWidth,
          drawHeight,
        );
      });
      context.filter = prevFilter;
      context.globalAlpha = prevAlpha;
      context.globalCompositeOperation = prevComposite;
    }
    context.restore();
  }
}

function captureNpcPortrait(npc) {
  if (!npc) return null;
  const appearance = npc.appearance || null;
  const baseScale = npc.animator?.scale || NPC_SCALE;
  const hasAnimations = appearance?.animations && Object.keys(appearance.animations).length > 0;
  if (!hasAnimations) return null;
  const animator = new CozyNpcAnimator({
    animations: appearance.animations,
    shadow: null,
    scale: baseScale,
  });
  animator.setState("walk", { restart: true });
  animator.setMoving(false);
  animator.setDirectionFromVector(0, 1);
  const drawWidth = NPC_FRAME_WIDTH * baseScale;
  const drawHeight = NPC_FRAME_HEIGHT * baseScale;
  const size = Math.ceil(Math.max(drawWidth, drawHeight));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.clearRect(0, 0, size, size);
  animator.draw(context, size / 2, size / 2);
  // Tag the canvas with a unique id to aid debugging and de-dup logic.
  try {
    const existingCounter = window.__npcPortraitCounter || 0;
    window.__npcPortraitCounter = existingCounter + 1;
    canvas.__portraitId = `npc_portrait_${window.__npcPortraitCounter}`;
    canvas.__npcName = npc.name || "";
    canvas.npcName = npc.name || "";
    canvas.__battleRosterIndex = Number.isFinite(npc.__battleRosterIndex)
      ? npc.__battleRosterIndex
      : -1;
    console.debug && console.debug('captureNpcPortrait: created', { id: canvas.__portraitId });
  } catch (e) {}
  return canvas;
}

function captureVisitorPortrait(entity) {
  if (typeof captureNpcPortrait !== "function" || !entity) return null;
  try {
    return captureNpcPortrait(entity);
  } catch (e) {
    return null;
  }
}

class CozyNpc {
  constructor({ appearance, speed } = {}) {
    const animations = appearance?.animations || {};
    this.animator = new CozyNpcAnimator({
      animations,
      shadow: appearance?.shadow ?? null,
    });
    this.appearance = appearance || null;
    this.isCozyNpc = true;
  this.radius = NPC_RADIUS;
  // Reduce the safeTopMargin so NPCs can walk closer to / above the HUD
  // without being clamped too early by clampEntityToBounds. Previously
  // this used a large margin which prevented natural "walk off" behavior.
  this.safeTopMargin = Math.max(this.radius * 2, 24);
    this.speed = speed ?? randomInRange(42, 58);
    const spawn = this.getRandomWalkPoint();
    this.x = spawn.x;
    this.y = spawn.y;
    this.target = this.getRandomWalkPoint();
    this.idleTimer = randomInRange(0.3, 1.0);
    this.stuckTimer = 0;
    this.state = "wander";
    this.processionTarget = null;
    this.processionSpeed = null;
  this.maxFaith = NPC_MAX_FAITH;
  // Start NPCs at configurable fraction of max faith so they can build up
  // and participate in combat during the level.
    this.faith = this.maxFaith;
    // Per-NPC cooldown timer for firing projectiles (seconds). When <= 0 NPC may fire.
    this.npcArrowCooldown = 0;
    this.faithBarVisible = false;
  this.faithBarTimer = 0; // seconds to force the faith bar visible
    this.drainSource = null;
    this.active = true;
    this.exitTarget = null;
    this.returnTarget = null;
    this.recoveryTextCooldown = 0;
    this.departed = false;
    this.needsPlayerRestore = false;
    this.animator.setState("walk", { restart: true });
    this.statusBubble = null;
    this.statusBubbleTimer = 0;
    this.statusBubblePersistent = false;
    this.statusBubbleCritical = false;
    this.redFaithDialogueTriggered = false;
    this.pendingLossPortrait = null;
    this.lossRecorded = false;
    this.damageFlashTimer = 0;
    this.damageCooldown = 0;
    this.projectileGlowTimer = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.knockbackTimer = 0;
    this.formationWarmupTimer = 0;
    this.zonePatrolCommitTimer = 0;
    this.retreatCommitTimer = 0;
    this.safeRecoveryTimer = 0;
    this.zoneMoveMode = "frontline";
    this.frontlinePatrolTimer = randomInRange(0.35, 0.7);
    this.zonePatrolSide = Math.random() < 0.5 ? -1 : 1;
    this.patrolClock = Math.random() * Math.PI * 2;
    this.ensnaredByEnemy = null;
    this.ensnareResumeState = null;
    this.ensnareDrainTickTimer = 0;
  }

  isEnsnared() {
    return Boolean(this.ensnaredByEnemy && !this.departed && this.active);
  }

  setEnsnaredBy(enemy) {
    if (!enemy || this.departed || !this.active) return false;
    this.ensnaredByEnemy = enemy;
    this.ensnareResumeState = this.state;
    this.state = "ensnared";
    this.ignoreObstacles = true;
    this.ensnareDrainTickTimer = 0.08;
    this.animator.setState("hurt", { restart: true });
    this.animator.setMoving(false);
    this.updateFaithVisibility(true);
    return true;
  }

  clearEnsnare(enemy = null, { resume = true } = {}) {
    if (!this.ensnaredByEnemy) return;
    if (enemy && this.ensnaredByEnemy !== enemy) return;
    this.ensnaredByEnemy = null;
    const priorState = this.ensnareResumeState;
    this.ensnareResumeState = null;
    this.ensnareDrainTickTimer = 0;
    this.ignoreObstacles = false;
    if (!resume || this.departed || !this.active) return;
    if ((this.faith || 0) <= 0) {
      this.loseFaith();
      return;
    }
    if (priorState === "returning") {
      this.beginReturn();
      return;
    }
    this.resumeWander();
  }

  needsAid() {
    if (!this.active || this.departed) return false;
    return this.faith < this.maxFaith || this.state === "drained";
  }

  loseFaith() {
    if (this.state === "lostFaith" || this.state === "departed") return;
    this.faith = 0;
    this.needsPlayerRestore = true;
    this.state = "lostFaith";
    this.exitTarget = this.exitTarget || this.getExitPoint();
    this.animator.setState("walk", { restart: true });
    this.animator.setMoving(true);
    this.updateFaithVisibility(true);
    this.setStatusBubble("I'm outta here!", { color: "#FF6B6B", persist: true, critical: true });
    if (typeof captureNpcPortrait === "function") {
      this.pendingLossPortrait = captureNpcPortrait(this);
    } else {
      this.pendingLossPortrait = null;
    }
    this.lossRecorded = false;
  }

  beginReturn({ announce = false } = {}) {
    if (this.departed) return;
    this.needsPlayerRestore = false;
    this.state = "returning";
    this.returnTarget = this.getReturnPoint();
    this.animator.setState("walk", { restart: true });
    this.animator.setMoving(true);
    this.updateFaithVisibility(this.faith < this.maxFaith);
    const returnLine = randomChoice(NPC_RETURN_LINES) || "I'm heading back.";
    this.setStatusBubble(returnLine, { color: "#9BD9FF", duration: 2.6 });
    this.pendingLossPortrait = null;
    this.lossRecorded = false;
    if (announce && this.recoveryTextCooldown <= 0) {
      this.recoveryTextCooldown = 2.5;
      spawnRayboltEffect(this.x, this.y - this.radius / 2, this.radius * 2.2);
    }
  }

  resumeWander() {
    if (this.departed) return;
    this.needsPlayerRestore = false;
    this.state = "wander";
    this.target =
      this.zoneMoveMode === "briefing"
        ? getNpcBriefingPoint(this)
        : getNpcFrontlineDesiredPoint(this);
    this.idleTimer = 0;
    this.stuckTimer = 0;
    this.processionTarget = null;
    this.processionSpeed = null;
    this.ignoreObstacles = false;
    this.animator.setState("walk");
    this.animator.setMoving(false);
    this.updateFaithVisibility(false);
    this.clearStatusBubble();
    this.pendingLossPortrait = null;
    this.lossRecorded = false;
    this.ignoreObstacles = false;
    this.zoneMoveMode = this.zoneMoveMode === "briefing" ? "briefing" : "frontline";
    this.frontlinePatrolTimer = 0;
  }

  beginProcession({ startX, startY, target, speed } = {}) {
    if (typeof startX === "number") this.x = startX;
    if (typeof startY === "number") this.y = startY;
    this.processionTarget = target || this.getReturnPoint();
    this.processionSpeed = speed || this.speed;
    this.ignoreObstacles = true;
    this.state = "procession";
    this.animator.setState("walk", { restart: true });
    this.animator.setMoving(true);
    this.updateFaithVisibility(false);
  }

  isInProcession() {
    return this.state === "procession";
  }

  receiveFaith(amount, options = {}) {
    if (!this.active || this.departed) return false;
    const { allowFromZero = false } = options;
    if (this.needsPlayerRestore && !allowFromZero) return false;
    if (typeof amount !== "number" || amount <= 0) return false;
    const prevFaith = this.faith;
    this.faith = Math.min(this.maxFaith, this.faith + amount);
    if (allowFromZero && this.faith > 0) {
      this.needsPlayerRestore = false;
    }
    const fullFaith = this.faith >= this.maxFaith - 0.01;
    if (this.state === "lostFaith") {
      // If the NPC is in the process of leaving due to lost faith, any
      // positive restoration should cancel the departure and send the NPC
      // back home. Previously we required full faith; change that so a
      // partial restore (>0) triggers a return.
      if (this.faith > 0) {
        // Do not immediately set to max; allow partial faith to persist but
        // transition the NPC back into the returning state so it heads home.
        this.beginReturn({ announce: true });
      } else if (fullFaith) {
        this.faith = this.maxFaith;
        this.beginReturn({ announce: true });
      }
      this.updateFaithVisibility(true);
      return this.faith > prevFaith;
    }
    if (fullFaith && this.state !== "wander") {
      this.faith = this.maxFaith;
      if (this.state !== "returning") {
        this.beginReturn({ announce: true });
      }
    }
    if ((this.maxFaith || 0) > 0) {
      const ratio = this.faith / this.maxFaith;
      if (ratio > getNpcRedFaithThresholdRatio()) {
        this.redFaithDialogueTriggered = false;
      }
    }
    this.updateFaithVisibility(true);
    return this.faith > prevFaith;
  }

  maybeSpeakRedFaithDialogue(prevFaith) {
    if (!this.active || this.departed) return;
    if (this.state === "lostFaith" || this.state === "departed") return;
    if ((this.maxFaith || 0) <= 0) return;
    if (this.redFaithDialogueTriggered) return;
    const thresholdRatio = getNpcRedFaithThresholdRatio();
    const startRatio = Math.max(0, Math.min(1, (prevFaith || 0) / this.maxFaith));
    const endRatio = Math.max(0, Math.min(1, (this.faith || 0) / this.maxFaith));
    if (!(startRatio > thresholdRatio && endRatio > 0 && endRatio <= thresholdRatio)) return;
    const line = getNpcRedFaithDialogueLine();
    if (!line) return;
    this.redFaithDialogueTriggered = true;
    this.setStatusBubble(line, {
      color: "#FFD6D6",
      duration: getNpcRedFaithDialogueLife(),
    });
  }

  tryNpcFire(dt) {
    // NPCs can fire arrows once at full faith and respecting cooldowns.
    if (!this.active || this.departed) return false;
    if (this.isEnsnared()) return false;
    if (this.faith <= 0) return false;
    // countdown
    const timerScale = getNpcTimerScale();
    this.npcArrowCooldown = Math.max(0, (this.npcArrowCooldown || 0) - dt * timerScale);
    if (this.npcArrowCooldown > 0) return false;
    // find nearest valid enemy or hostile projectile target
    let best = null;
    let bestDist = Infinity;
    const maxRange = typeof NPC_ARROW_RANGE_DEFAULT === 'number' ? NPC_ARROW_RANGE_DEFAULT : 520;
    for (const e of enemies) {
      if (!isEnemyTargetableForAutoAim(e)) continue;
      const dx = e.x - this.x;
      const dy = e.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d < bestDist && d <= maxRange) {
        bestDist = d;
        best = { e, dx, dy, d };
      }
    }
    for (const proj of projectiles) {
      if (!proj || proj.dead || proj.friendly) continue;
      const dx = proj.x - this.x;
      const dy = proj.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d < bestDist && d <= maxRange) {
        bestDist = d;
        best = { e: proj, dx, dy, d };
      }
    }
    if (!best) return false;
    const dir = normalizeVector(best.dx, best.dy);
    let baseCooldown =
      typeof devTools?.npcFireCooldown === "number"
        ? devTools.npcFireCooldown
        : typeof NPC_ARROW_COOLDOWN_DEFAULT === "number"
        ? NPC_ARROW_COOLDOWN_DEFAULT
        : 2.4;
    const formation = getFormationBonuses();
    const harmonyMultiplier = npcHarmonyBuffTimer > 0 ? HARMONY_BUFF_MULTIPLIER : 1;
    const fireRateMultiplier = harmonyMultiplier * (1 + (formation.rof || 0));

    // NPC weapon power-up handling
    const weaponMode = npcWeaponState.mode || "arrow";
    const guidedStudyArrowShot =
      weaponMode === "arrow" &&
      formation.armorPierce === true &&
      typeof formation.projectileType === "string" &&
      formation.projectileType.length > 0;
    const shotType = guidedStudyArrowShot ? formation.projectileType : weaponMode;
    const npcDamageMult = npcWeaponState.damageMultiplier || 1;
    const npcCooldownMult = npcWeaponState.cooldownMultiplier || 1;
    const npcSpeedMult = npcWeaponState.speedMultiplier || 1;

    const baseCfg = PROJECTILE_CONFIG[weaponMode] || PROJECTILE_CONFIG.arrow;
    if (weaponMode === "fire") {
      baseCooldown = 1.0;
    } else if (weaponMode !== "arrow" && baseCfg?.cooldownAfterFire) {
      // NPC power weapons fire at 25% of the player base fire rate (4x cooldown),
      // except wisdom NPC power, which is 50% (2x cooldown) to avoid being too slow.
      const npcRateScale = weaponMode === "wisdom_missle" ? 2 : 4;
      baseCooldown = baseCfg.cooldownAfterFire * npcRateScale;
    }

    const cooldown = Math.max(0.02, (baseCooldown * npcCooldownMult) / fireRateMultiplier);

    let damageBase =
      weaponMode === "arrow"
        ? NPC_ARROW_DAMAGE
        : (baseCfg?.damage ?? NPC_ARROW_DAMAGE);
    let damage =
      damageBase *
      (weaponMode === "arrow" ? 1 : npcDamageMult) *
      harmonyMultiplier *
      (1 + (formation.damage || 0));
    damage = Math.max(1, Math.round(damage));

    const baseScale = weaponMode === "arrow" ? 1.6 : (baseCfg?.scale || 2) * 0.5;
    const scale = baseScale * fireRateMultiplier;
    const speedOverride =
      weaponMode === "arrow"
        ? null
        : (baseCfg?.speed || 0) * npcSpeedMult;

    // spawn projectile from NPC toward the enemy
    const shotOverrides = {
      friendly: true,
      damage,
      source: this,
      scale,
      flipHorizontal: dir.x < 0,
    };
    if (speedOverride && speedOverride > 0) {
      shotOverrides.speed = speedOverride;
    }
    if (guidedStudyArrowShot) {
      shotOverrides.ignoreArmorDeflect = true;
      shotOverrides.ignoreProjectileResistance = true;
    }
    spawnProjectile(shotType, this.x, this.y, dir.x, dir.y, shotOverrides);
    if (weaponMode === "arrow" && typeof playDefaultArrowSfx === "function") {
      playDefaultArrowSfx(0.55);
    }
    if (weaponMode === "fire" && typeof playFireballCastSfx === "function") {
      playFireballCastSfx(0.55);
    }
    if (weaponMode === "wisdom_missle" && typeof playWisdomCastSfx === "function") {
      playWisdomCastSfx(0.55);
    }
    if (weaponMode === "faith_cannon" && typeof playFaithCannonSfx === "function") {
      playFaithCannonSfx(0.55);
    }
    // set cooldown (use devTools value if present)
    this.npcArrowCooldown = cooldown;
    this.updateFaithVisibility(true);
    return true;
  }

  sufferAttack(damage = 1, options = {}) {
    if (!this.active || this.departed) return;
    const { sourceType, bypassCooldown = false } = options || {};
    const noCooldownSource = bypassCooldown || isNoCooldownDamageSource(sourceType);
    if (this.damageCooldown > 0 && !noCooldownSource) return false;
    const prevFaith = this.faith;
    const baseDamage = Math.max(1, Math.round(damage || 1));
    const cappedLoss = Math.min(NPC_MAX_FAITH_LOSS_PER_ATTACK, baseDamage);
    const damageScale = 1;
    const scaledLoss = Math.max(1, Math.round(cappedLoss * damageScale));
    // Debug: report incoming damage and computed faith loss
    if (typeof console !== 'undefined' && console.debug) {
      console.debug &&
        console.debug("NPC.sufferAttack", {
          type: this.type,
          incomingDamage: damage,
          baseDamage,
          cappedLoss,
          scaledLoss,
          prevFaith,
        });
    }
    this.faith = Math.max(0, this.faith - scaledLoss);
    this.maybeSpeakRedFaithDialogue(prevFaith);
    if (scaledLoss > 0 && (this.maxFaith || 0) > 0) {
      const startRatio = prevFaith / this.maxFaith;
      const endRatio = this.faith / this.maxFaith;
      this.faithDamageFlash = {
        startRatio,
        endRatio,
        timer: 1.0,
        duration: 1.0,
        flashes: 3,
      };
    }
  // Visual debug: floating text showing faith lost
    try {
      showDamage(this, scaledLoss, {
        color: "#EAF6FF",
        fadeDelay: 0.5,
      });
    } catch (e) {}
    if (typeof playNpcHurtSfx === "function") {
      playNpcHurtSfx(0.6);
    }
    spawnFlashEffect(this.x, this.y - this.radius / 2);
    this.damageFlashTimer = DAMAGE_FLASH_DURATION;
    this.faithBarTimer = 2.4;
    this.faithBarVisible = true;
    if (!noCooldownSource) {
      this.damageCooldown = NPC_DAMAGE_COOLDOWN;
    }
    if (this.faith <= 0) {
      this.faith = 0;
      this.loseFaith();
      return;
    }
    this.updateFaithVisibility(true);
    // While taking damage, do not trigger speech bubbles (they interrupt gameplay).
    // Keep the cooldown so we don't spam other recovery texts, but avoid the spoken line.
    if (this.state === "wander" && this.recoveryTextCooldown <= 0 && this.faith < prevFaith) {
      this.recoveryTextCooldown = 2.0;
      // intentionally do not call setStatusBubble here to keep NPCs silent while hit
    }
  }

  updateFaithVisibility(force = false) {
    this.faithBarVisible = force || this.faith < this.maxFaith || this.state !== "wander";
    // Debug: whether the faith bar should be visible now
    if (typeof console !== 'undefined' && console.debug) {
      console.debug && console.debug('NPC.updateFaithVisibility', { type: this.type, force, faith: this.faith, maxFaith: this.maxFaith, state: this.state, faithBarVisible: this.faithBarVisible });
    }
  }

  setStatusBubble(message, { color = "#EAF6FF", duration = 2.5, persist = false, critical = false } = {}) {
    if (this.statusBubble) this.statusBubble.life = 0;
    if (!message) {
      this.statusBubble = null;
      this.statusBubbleTimer = 0;
      this.statusBubblePersistent = false;
      this.statusBubbleCritical = false;
      return;
    }
    const life = Math.max(0.1, duration);
    const bubbleLife = persist ? 9999 : life;
    this.statusBubblePersistent = persist;
    this.statusBubbleCritical = critical;
    this.statusBubbleTimer = persist ? Number.POSITIVE_INFINITY : life;
    this.statusBubble = addFloatingTextAt(this.x, this.y - this.radius - 22, message, color, {
      speechBubble: true,
      vy: 0,
      life: bubbleLife,
      entity: this,
      offsetY: -this.radius - 22,
      bubbleTheme: "npc",
      persist,
      critical: critical || persist,
    });
  }

  clearStatusBubble() {
    if (this.statusBubble) {
      this.statusBubble.life = 0;
      this.statusBubble = null;
    }
    this.statusBubbleTimer = 0;
    this.statusBubblePersistent = false;
    this.statusBubbleCritical = false;
  }

  recordLoss() {
    if (this.lossRecorded) return;
    const portrait = this.pendingLossPortrait || null;
    if (levelManager?.notifyNpcLost) {
      levelManager.notifyNpcLost(portrait);
    }
    this.lossRecorded = true;
    this.pendingLossPortrait = null;
    this.clearStatusBubble();
  }

  update(dt, options = {}) {
    const previewOnly = Boolean(options?.previewOnly);
    if (this.departed) return;
    if (previewOnly) {
      this.zonePatrolCommitTimer = Math.max(0, (this.zonePatrolCommitTimer || 0) - dt);
      this.retreatCommitTimer = Math.max(0, (this.retreatCommitTimer || 0) - dt);
      this.frontlinePatrolTimer = Math.max(0, (this.frontlinePatrolTimer || 0) - dt);
    } else {
      this.recoveryTextCooldown = Math.max(0, this.recoveryTextCooldown - dt);
      this.zonePatrolCommitTimer = Math.max(0, (this.zonePatrolCommitTimer || 0) - dt);
      this.retreatCommitTimer = Math.max(0, (this.retreatCommitTimer || 0) - dt);
      this.frontlinePatrolTimer = Math.max(0, (this.frontlinePatrolTimer || 0) - dt);
      const timerScale = getNpcTimerScale();
      this.faithBarTimer = Math.max(0, (this.faithBarTimer || 0) - dt * timerScale);
      this.damageFlashTimer = Math.max(0, this.damageFlashTimer - dt);
      this.projectileGlowTimer = Math.max(0, (this.projectileGlowTimer || 0) - dt);
      if (this.faithDamageFlash?.timer > 0) {
        this.faithDamageFlash.timer = Math.max(0, this.faithDamageFlash.timer - dt);
      }
    }
    if (this.statusBubblePersistent) {
      this.statusBubbleTimer = Number.POSITIVE_INFINITY;
    } else if (this.statusBubbleTimer > 0) {
      this.statusBubbleTimer = Math.max(0, this.statusBubbleTimer - dt);
      if (this.statusBubbleTimer <= 0) this.clearStatusBubble();
    }

    switch (this.state) {
      case "wander":
        this.updateWander(dt);
        break;
      case "ensnared":
        this.updateEnsnared(dt);
        break;
      case "procession":
        this.updateProcession(dt);
        break;
      case "drained":
        this.updateDrained(dt);
        break;
      case "lostFaith":
        this.updateLostFaith(dt);
        break;
      case "returning":
        this.updateReturning(dt);
        break;
      default:
        break;
    }

    if (this.knockbackTimer > 0) {
      const step = Math.min(this.knockbackTimer, dt);
      this.x += this.knockbackVx * step;
      this.y += this.knockbackVy * step;
      this.knockbackTimer = Math.max(0, this.knockbackTimer - dt);
      if (this.knockbackTimer <= 0) {
        this.knockbackVx = 0;
        this.knockbackVy = 0;
      }
      clampEntityToBounds(this);
    }

    this.animator.update(dt);
  }

  updateProcession(dt) {
    this.animator.setState("walk");
    const target = this.processionTarget || this.getReturnPoint();
    if (!target) {
      this.resumeWander();
      return;
    }
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.hypot(dx, dy);
    if (!distance || distance < 8) {
      this.resumeWander();
      return;
    }
    const dirX = dx / distance;
    const dirY = dy / distance;
    const speed = this.processionSpeed || this.speed;
    this.x += dirX * speed * dt;
    this.y += dirY * speed * dt;
    this.animator.setDirectionFromVector(dirX, dirY);
    this.animator.setMoving(true);
    resolveEntityObstacles(this);
    clampEntityToBounds(this);
    this.updateFaithVisibility(false);
  }

  updateWander(dt) {
    this.animator.setState("walk");
    this.patrolClock = (this.patrolClock || 0) + dt * 1.45;
    if ((this.formationWarmupTimer || 0) > 0 && this.formationAnchor) {
      this.formationWarmupTimer = Math.max(0, this.formationWarmupTimer - dt);
      this.x = this.formationAnchor.x;
      this.y = this.formationAnchor.y;
      this.target = { x: this.x, y: this.y };
      this.zoneMoveMode = "frontline";
      this.animator.setMoving(false);
      this.updateFaithVisibility(false);
      return;
    }
    if (this.zoneMoveMode === "briefing") {
      this.target = getNpcBriefingPoint(this);
    }
    const threatRetreatTarget = getNpcThreatAvoidanceTarget(this);
    if (threatRetreatTarget) {
      this.safeRecoveryTimer = 0;
      this.zoneMoveMode = "retreat";
    } else if (this.zoneMoveMode !== "briefing") {
      this.safeRecoveryTimer = Math.min(1, (this.safeRecoveryTimer || 0) + dt);
      if ((this.safeRecoveryTimer || 0) >= 0.22) {
        this.zoneMoveMode = "frontline";
      }
    }
    this.target =
      this.zoneMoveMode === "briefing"
        ? getNpcBriefingPoint(this)
        : this.zoneMoveMode === "retreat" && threatRetreatTarget
        ? threatRetreatTarget
        : getNpcFrontlineDesiredPoint(this);
    if (!this.target) {
      this.animator.setMoving(false);
      this.updateFaithVisibility(false);
      return;
    }
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.hypot(dx, dy);

    if (!distance || distance < 4) {
      this.animator.setMoving(false);
      this.updateFaithVisibility(false);
      return;
    }

    const prevX = this.x;
    const prevY = this.y;
    const dirX = dx / distance;
    const dirY = dy / distance;

    const movementSpeed = this.speed * (this.zoneMoveMode === "retreat" ? 1.3 : 1.04);
    this.x += dirX * movementSpeed * dt;
    this.y += dirY * movementSpeed * dt;
    this.animator.setDirectionFromVector(dirX, dirY);
    this.animator.setMoving(true);

    resolveEntityObstacles(this);
    clampEntityToBounds(this);

    const travelled = Math.hypot(this.x - prevX, this.y - prevY);
    if (travelled < 0.5) {
      this.stuckTimer += dt;
      if (this.stuckTimer > 1.2) {
        this.patrolClock += Math.PI * 0.65;
        if (this.zoneMoveMode !== "retreat") {
          this.zonePatrolSide *= -1;
        }
        this.stuckTimer = 0;
      }
    } else {
      this.stuckTimer = 0;
    }

    this.updateFaithVisibility(false);
  }

  updateEnsnared(dt) {
    this.animator.setState("hurt");
    this.animator.setMoving(false);
    const source = this.ensnaredByEnemy;
    const sourceValid =
      source &&
      !source.dead &&
      source.state !== "death" &&
      source.demonessGrabTarget === this;
    if (!sourceValid) {
      this.clearEnsnare(source, { resume: true });
      return;
    }
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.knockbackTimer = 0;
    const dx = source.x - this.x;
    const dy = source.y - this.y;
    const distance = Math.hypot(dx, dy);
    const drainRange = Math.max(72, (source.radius || 0) + (this.radius || 0) + 18);
    if (distance <= drainRange) {
      this.ensnareDrainTickTimer = Math.max(0, (this.ensnareDrainTickTimer || 0) - dt);
      if (this.ensnareDrainTickTimer <= 0 && this.faith > 0) {
        const prevFaith = this.faith;
        this.sufferAttack(1, {
          sourceType: source.type,
          bypassCooldown: true,
        });
        if (
          Number.isFinite(prevFaith) &&
          Number.isFinite(this.faith) &&
          this.faith < prevFaith &&
          Number.isFinite(source.demonessDrainedFaith)
        ) {
          source.demonessDrainedFaith += prevFaith - this.faith;
        }
        this.ensnareDrainTickTimer = 0.34;
      }
    } else {
      this.ensnareDrainTickTimer = Math.min(this.ensnareDrainTickTimer || 0.08, 0.08);
    }
    this.updateFaithVisibility(true);
  }

  updateDrained(dt) {
    this.animator.setState("hurt");
    this.animator.setMoving(false);
    const draining = this.isDraining();
    if (draining) {
      const prevFaith = this.faith;
      this.faith = Math.max(0, this.faith - NPC_FAITH_DRAIN_RATE * dt);
      this.maybeSpeakRedFaithDialogue(prevFaith);
      if (this.faith <= 0) {
        this.loseFaith();
        return;
      }
    } else if (this.faith >= NPC_FAITH_RETURN_THRESHOLD) {
      this.beginReturn({ announce: true });
      return;
    }
    this.updateFaithVisibility(true);
  }

  updateLostFaith(dt) {
    this.animator.setState("walk");
    this.animator.setMoving(true);
    this.updateFaithVisibility(true);
    if (!this.exitTarget) this.exitTarget = this.getExitPoint();
    const prevX = this.x;
    const prevY = this.y;
    const dx = this.exitTarget.x - this.x;
    const dy = this.exitTarget.y - this.y;
    const distance = Math.hypot(dx, dy) || 1;
    const dirX = dx / distance;
    const dirY = dy / distance;
    this.animator.setDirectionFromVector(dirX, dirY);
    this.x += dirX * (this.speed * 0.92) * dt;
    this.y += dirY * (this.speed * 0.92) * dt;
    const margin = 160;
    const exitX = this.exitTarget ? this.exitTarget.x : (prevX < canvas.width / 2 ? -margin : canvas.width + margin);
    const exitingLeft = exitX <= prevX;
    const reachedExitTarget = exitingLeft ? this.x <= exitX : this.x >= exitX;
    const edgeBuffer = Math.max(12, (this.radius || 24) * 0.6);
    const leftEdge = edgeBuffer;
    const rightEdge = canvas.width - edgeBuffer;
    const exitedLeftVisibly = exitingLeft && prevX > leftEdge && this.x <= leftEdge;
    const exitedRightVisibly = !exitingLeft && prevX < rightEdge && this.x >= rightEdge;
    if (reachedExitTarget || exitedLeftVisibly || exitedRightVisibly || this.x <= -margin || this.x >= canvas.width + margin) {
      // spawn smoke effect at NPC's feet so they vanish into smoke
      try {
        const puffX = exitingLeft ? leftEdge : rightEdge;
        const playableTop = HUD_HEIGHT + Math.max(this.radius || 0, 16);
        const playableBottom = canvas.height - Math.max(this.radius || 0, 16);
        const puffY = Math.max(playableTop, Math.min(playableBottom, this.y));
        spawnSmokeEffect(puffX, puffY, Math.max(0.8, (this.radius || 24) / 24));
        this.x = puffX;
        this.y = puffY;
      } catch (e) {}
      this.state = "departed";
      this.departed = true;
      this.active = false;
      this.recordLoss();
      return;
    }
  }

  updateReturning(dt) {
    this.animator.setState("walk");
    if (!this.returnTarget) this.returnTarget = this.getReturnPoint();
    const dx = this.returnTarget.x - this.x;
    const dy = this.returnTarget.y - this.y;
    const distance = Math.hypot(dx, dy);
    if (!distance || distance < 16) {
      this.faith = Math.min(this.faith, this.maxFaith);
      this.resumeWander();
      return;
    }
    const dirX = dx / distance;
    const dirY = dy / distance;
    this.animator.setDirectionFromVector(dirX, dirY);
    this.animator.setMoving(true);
    this.x += dirX * this.speed * dt;
    this.y += dirY * this.speed * dt;
    resolveEntityObstacles(this);
    clampEntityToBounds(this);
    this.updateFaithVisibility(this.faith < this.maxFaith);
  }

  getRandomWalkPoint() {
    const bounds = getNpcHomeBounds();
    const anchor = this.formationAnchor || null;
    const jitter = formationState?.jitterRadius ?? 0;
    if (anchor) {
      const inwardBias = Math.max(0, Math.min(1, formationState?.homePressure || 0));
      const point = getNpcZoneWanderPoint(this, { inwardBias });
      return {
        x: clamp(point.x + randomInRange(-jitter * 0.35, jitter * 0.35), bounds.minX, bounds.maxX),
        y: clamp(point.y + randomInRange(-jitter * 0.25, jitter * 0.25), bounds.minY, bounds.maxY),
      };
    }
    return {
      x: randomInRange(bounds.x - bounds.radius * 0.8, bounds.x + bounds.radius * 0.8),
      y: randomInRange(bounds.y - bounds.radius * 0.8, bounds.y + bounds.radius * 0.8),
    };
  }

  getReturnPoint() {
    return getNpcZoneWanderPoint(this, { inwardBias: 0.5, angleJitterScale: 0.24 });
  }

  getExitPoint() {
    const margin = 140;
    const exitYMin = HUD_HEIGHT + this.radius + 8;
    const exitYMax = canvas.height - this.radius - 8;
    const clampedY = Math.max(exitYMin, Math.min(exitYMax, this.y));
    const left = { x: -margin, y: clampedY };
    const right = { x: canvas.width + margin, y: clampedY };
    const distToLeft = Math.abs(this.x - left.x);
    const distToRight = Math.abs(right.x - this.x);
    return distToLeft <= distToRight ? left : right;
  }

  shouldShowFaithBar() {
  // Always show the NPC faith bar during gameplay unless the NPC has departed.
  // Previously visibility depended on timers/flags which made the bar disappear and
  // hard to read during tests. Keep it visible for easier playtesting.
  return !this.departed;
  }

  drawFaithBar() {
    const ratio = this.maxFaith > 0 ? Math.max(0, Math.min(1, this.faith / this.maxFaith)) : 0;
    const width = NPC_FAITH_BAR_WIDTH;
    const height = NPC_FAITH_BAR_HEIGHT;
    const barX = this.x - width / 2;
    const barY = this.y - this.radius - 4;
    if (LOG_NPC_FAITH_BAR && typeof console !== 'undefined' && console.debug) {
      console.debug &&
        console.debug('NPC.drawFaithBar', {
          type: this.type,
          faith: this.faith,
          maxFaith: this.maxFaith,
          ratio,
          barX,
          barY,
        });
    }
    const overlays = typeof window !== 'undefined' ? window.__battlechurchNpcFaithOverlays : null;
    if (Array.isArray(overlays)) {
      overlays.push({
        ratio,
        width,
        height,
        x: barX,
        y: barY,
        owner: this,
        damageFlash: this.damageFlashTimer > 0
          ? Math.min(1, this.damageFlashTimer / DAMAGE_FLASH_DURATION)
          : 0,
      });
      return;
    }
    ctx.save();
    const radius = Math.max(6, Math.floor(height / 2));
    ctx.fillStyle = 'rgba(10, 15, 31, 0.6)';
    roundRect(ctx, barX, barY, width, height, radius, true, false);
    const fillW = Math.max(0, Math.floor((width - 4) * ratio));
    if (fillW > 0) {
      ctx.fillStyle = NPC_FAITH_FILL_COLOR;
      ctx.fillRect(barX + 2, barY + 2, fillW, height - 4);
    }
    const faithFlash = this.faithDamageFlash;
    if (faithFlash?.timer > 0 && faithFlash.duration > 0) {
      const startRatio = Math.max(0, Math.min(1, faithFlash.startRatio || 0));
      const endRatio = Math.max(0, Math.min(1, faithFlash.endRatio || 0));
      const delta = Math.max(0, startRatio - endRatio);
      if (delta > 0) {
        const progress = 1 - faithFlash.timer / faithFlash.duration;
        const pulse = Math.abs(Math.sin(progress * Math.PI * (faithFlash.flashes || 3)));
        const alpha = 0.2 + 0.8 * pulse;
        const segmentX = barX + 2 + Math.floor((width - 4) * endRatio);
        const segmentW = Math.max(1, Math.floor((width - 4) * delta));
        ctx.fillStyle = `rgba(255, 246, 170, ${alpha.toFixed(3)})`;
        ctx.fillRect(segmentX, barY + 2, segmentW, height - 4);
      }
    }
    if (ratio > 0 && ratio <= 0.33) {
      try {
        const t = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const alpha = Math.abs(Math.sin(t * 0.01)) * 0.65;
        ctx.fillStyle = `rgba(255,60,60,${alpha.toFixed(3)})`;
        roundRect(
          ctx,
          barX + 2,
          barY + 2,
          width - 4,
          height - 4,
          Math.max(4, Math.floor((height - 4) / 2)),
          true,
          false,
        );
      } catch (e) {}
    } else if (ratio <= 0) {
      try {
        const t = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const alpha = 0.25 + Math.abs(Math.sin(t * 0.005)) * 0.45;
        ctx.fillStyle = `rgba(255,60,60,${alpha.toFixed(3)})`;
        roundRect(
          ctx,
          barX + 2,
          barY + 2,
          width - 4,
          height - 4,
          Math.max(4, Math.floor((height - 4) / 2)),
          true,
          false,
        );
      } catch (e) {}
    }
    if (this.damageFlashTimer > 0) {
      try {
        const t = (performance.now ? performance.now() : Date.now());
        const blinkOn = Math.sin(t * 0.03) > 0;
        if (blinkOn) {
          ctx.globalCompositeOperation = "destination-out";
          ctx.fillStyle = "rgba(0,0,0,0.9)";
          roundRect(
            ctx,
            barX + 2,
            barY + 2,
            width - 4,
            height - 4,
            Math.max(4, Math.floor((height - 4) / 2)),
            true,
            false,
          );
          ctx.globalCompositeOperation = "source-over";
        }
      } catch (e) {}
    }
    // No special highlight for full health; keep the same fill color.
    ctx.restore();
  }

  draw() {
      if (this.departed) return;
      const flashStrength = this.damageFlashTimer > 0
        ? Math.min(1, Math.pow(this.damageFlashTimer / DAMAGE_FLASH_DURATION, 0.6))
        : 0;
      const glowTimer = this.projectileGlowTimer || 0;
      if (glowTimer > 0 && typeof drawProjectileGlow === "function") {
        const strength = Math.min(1, glowTimer / 0.22);
        const glowSize = Math.max(this.radius * 3.2, 76);
        ctx.save();
        ctx.translate(this.x, this.y);
        drawProjectileGlow(glowSize, glowSize, {
          radiusScale: 1.2,
          baseAlpha: 0.24 * strength,
          pulseScale: 0.28 * strength,
        });
        ctx.restore();
      }
      this.animator.draw(ctx, this.x, this.y, { flashWhite: flashStrength });
      if (this.shouldShowFaithBar()) {
        this.drawFaithBar();
      }
      // Ensure window.npcs is always up to date for renderer
      if (typeof window !== 'undefined') {
        window.npcs = npcs;
      }
    }
}

function getEnemyHitboxRadius(enemy) {
  if (!enemy) return 0;
  const hitbox = enemy.hitbox || enemy.config?.hitbox || null;
  if (hitbox && Number.isFinite(hitbox.width) && Number.isFinite(hitbox.height)) {
    return Math.max(hitbox.width, hitbox.height) * 0.5;
  }
  return enemy.config?.hitRadius || enemy.radius || 0;
}

function getEnemyContactDamageValue(enemy) {
  const config = enemy?.config || enemy || null;
  if (!config) return 0;
  if (Number.isFinite(config.contactDamage) && config.contactDamage >= 0) {
    return config.contactDamage;
  }
  if (Number.isFinite(config.damage) && config.damage >= 0) {
    return config.damage;
  }
  return 0;
}

function getEnemyAttackDamageValue(enemy) {
  const config = enemy?.config || enemy || null;
  if (!config) return 0;
  if (Number.isFinite(config.attackHitDamage) && config.attackHitDamage >= 0) {
    return config.attackHitDamage;
  }
  if (Number.isFinite(config.attackDamage) && config.attackDamage >= 0) {
    return config.attackDamage;
  }
  if (Number.isFinite(config.damage) && config.damage >= 0) {
    return config.damage;
  }
  return 0;
}

function isEnemyInKnockback(enemy) {
  return Boolean(enemy && Number.isFinite(enemy.knockbackTimer) && enemy.knockbackTimer > 0);
}

function getEnemyHitboxCenter(enemy) {
  const hitbox = enemy?.hitbox || enemy?.config?.hitbox || null;
  const offsetX = hitbox && Number.isFinite(hitbox.offsetX) ? hitbox.offsetX : 0;
  const offsetY = hitbox && Number.isFinite(hitbox.offsetY) ? hitbox.offsetY : 0;
  return {
    x: (enemy?.x || 0) + offsetX,
    y: (enemy?.y || 0) + offsetY,
  };
}

function isEnemyTargetableForAutoAim(enemy) {
  if (!enemy || enemy.dead || enemy.state === "death") return false;
  if (enemy.type === "miniDemonFireKeeper" && enemy.fireKeeperPhase === "hidden") return false;
  return true;
}

function spawnEnemyHitEffect(enemy, hitX = null, hitY = null, options = {}) {
  if (!enemy) return;
  const x = Number.isFinite(hitX) ? hitX : enemy.x;
  const y = Number.isFinite(hitY) ? hitY : enemy.y;
  const damageType = options?.damageType || null;
  const damageClass = (enemy.config?.damageClass || "normal").toLowerCase();
  if (damageType === "projectile" && damageClass === "armored") {
    const puffRadius = Math.max(18, getEnemyHitboxRadius(enemy) * 0.7);
    spawnPuffEffect(x, y, puffRadius);
    return;
  }
  if (enemy.type === "tormentorFlame") {
    const puffRadius = Math.max(18, (getEnemyHitboxRadius(enemy) || enemy.radius || 12) * 0.9);
    spawnPuffEffect(x, y, puffRadius);
    return;
  }
  spawnFlashEffect(x, y);
}

function isArmoredProjectileDeflectTarget(target, projectile, damageType) {
  if (!target || !projectile) return false;
  if (damageType !== "projectile") return false;
  if (!projectile.friendly) return false;
  if (projectile.ignoreArmorDeflect) return false;
  const damageClass = String(target.damageClass || target.config?.damageClass || "").toLowerCase();
  if (damageClass !== "armored") return false;
  return ARMORED_PROJECTILE_DEFLECT_TYPES.has(projectile.type);
}

function spawnArmoredProjectileDeflect(projectile, target, hitX, hitY) {
  if (!projectile || !target) return;
  const baseSpeed = Math.max(
    1,
    Math.hypot(projectile.vx || 0, projectile.vy || 0) * ARMORED_PROJECTILE_DEFLECT_SPEED_SCALE,
  );
  const center = typeof getEnemyHitboxCenter === "function" ? getEnemyHitboxCenter(target) : { x: target.x, y: target.y };
  let dirX = (hitX ?? projectile.x ?? 0) - center.x;
  let dirY = (hitY ?? projectile.y ?? 0) - center.y;
  if (Math.abs(dirX) < 0.001 && Math.abs(dirY) < 0.001) {
    dirX = -(projectile.vx || 0);
    dirY = -(projectile.vy || 0);
  }
  const baseAngle = Math.atan2(dirY, dirX);
  const angleOffset =
    ARMORED_PROJECTILE_DEFLECT_ANGLE +
    (Math.random() * 2 - 1) * ARMORED_PROJECTILE_DEFLECT_ANGLE_VARIANCE;
  const signedOffset = Math.random() < 0.5 ? -angleOffset : angleOffset;
  const deflectAngle = baseAngle + signedOffset;
  const dir = normalizeVector(Math.cos(deflectAngle), Math.sin(deflectAngle));
  const life = ARMORED_PROJECTILE_DEFLECT_DISTANCE / baseSpeed;
  const deflect = spawnProjectile(
    projectile.type,
    Number.isFinite(hitX) ? hitX : projectile.x,
    Number.isFinite(hitY) ? hitY : projectile.y,
    dir.x,
    dir.y,
    {
      friendly: false,
      damage: 0,
      source: null,
      speed: baseSpeed,
      life,
      scale: projectile.scale,
      flipHorizontal: dir.x < 0,
      visualOnly: true,
      onExpire: (proj) => {
        spawnEnemyHitEffect(
          target,
          Number.isFinite(proj?.x) ? proj.x : hitX,
          Number.isFinite(proj?.y) ? proj.y : hitY,
          { damageType: "projectile" },
        );
      },
    },
  );
  if (deflect) {
    deflect.rotation = Math.atan2(deflect.vy || 0, deflect.vx || 0);
  }
}

function isEnemyEntity(ent) {
  return Boolean(ent && !ent.isCozyNpc && !ent.isPlayer && typeof ent.type === "string");
}

function getEntityCollisionOffset(entity) {
  if (!isEnemyEntity(entity)) return { x: 0, y: 0 };
  const hitbox = entity?.config?.hitbox || null;
  return {
    x: hitbox && Number.isFinite(hitbox.offsetX) ? hitbox.offsetX : 0,
    y: hitbox && Number.isFinite(hitbox.offsetY) ? hitbox.offsetY : 0,
  };
}

function getEntityCollisionCenter(entity) {
  const offset = getEntityCollisionOffset(entity);
  return {
    x: (entity?.x || 0) + offset.x,
    y: (entity?.y || 0) + offset.y,
  };
}

function getEnemyHitboxRect(enemy) {
  if (!enemy) return null;
  const hitbox = enemy.config?.hitbox || null;
  if (!hitbox || !Number.isFinite(hitbox.width) || !Number.isFinite(hitbox.height)) return null;
  const width = hitbox.width;
  const height = hitbox.height;
  if (width <= 0 || height <= 0) return null;
  const offsetX = Number.isFinite(hitbox.offsetX) ? hitbox.offsetX : 0;
  const offsetY = Number.isFinite(hitbox.offsetY) ? hitbox.offsetY : 0;
  const center = getEnemyHitboxCenter(enemy);
  return {
    x: center.x - width / 2,
    y: center.y - height / 2,
    width,
    height,
  };
}

function getPlayerHitboxRect(targetPlayer = player) {
  if (!targetPlayer) return null;
  const hitbox = targetPlayer.config?.hitbox || PLAYER_CONFIG?.hitbox || null;
  if (!hitbox || !Number.isFinite(hitbox.width) || !Number.isFinite(hitbox.height)) return null;
  if (hitbox.width <= 0 || hitbox.height <= 0) return null;
  const facingSign = targetPlayer?.facing === "left" ? -1 : 1;
  const offsetX = Number.isFinite(hitbox.offsetX) ? hitbox.offsetX * facingSign : 0;
  const offsetY = Number.isFinite(hitbox.offsetY) ? hitbox.offsetY : 0;
  return {
    x: targetPlayer.x + offsetX - hitbox.width / 2,
    y: targetPlayer.y + offsetY - hitbox.height / 2,
    width: hitbox.width,
    height: hitbox.height,
  };
}

function circleIntersectsPlayerHurtbox(x, y, radius = 0, targetPlayer = player) {
  if (!targetPlayer || targetPlayer.state === "death") return false;
  const hurtbox = getPlayerHitboxRect(targetPlayer);
  const circleRadius = Math.max(0, Number(radius) || 0);
  if (hurtbox) {
    return circleIntersectsRect(x, y, circleRadius, hurtbox);
  }
  const dx = (targetPlayer.x || 0) - x;
  const dy = (targetPlayer.y || 0) - y;
  return Math.hypot(dx, dy) <= circleRadius + Math.max(0, targetPlayer.radius || 24);
}

function getPlayerWeaponHitboxLocalRect(targetPlayer = player) {
  if (!targetPlayer) return null;
  const weaponHitbox = targetPlayer.config?.weaponHitbox || PLAYER_CONFIG?.weaponHitbox || null;
  if (!weaponHitbox || !Number.isFinite(weaponHitbox.width) || !Number.isFinite(weaponHitbox.height)) return null;
  if (weaponHitbox.width <= 0 || weaponHitbox.height <= 0) return null;
  const offsetX = Number.isFinite(weaponHitbox.offsetX) ? weaponHitbox.offsetX : 0;
  const offsetY = Number.isFinite(weaponHitbox.offsetY) ? weaponHitbox.offsetY : 0;
  return {
    x: offsetX - weaponHitbox.width / 2,
    y: offsetY - weaponHitbox.height / 2,
    width: weaponHitbox.width,
    height: weaponHitbox.height,
  };
}

function getPlayerDashSlashHitboxLocalRect(targetPlayer = player) {
  if (!targetPlayer) return null;
  const hitbox = targetPlayer.config?.dashSlashHitbox || PLAYER_CONFIG?.dashSlashHitbox || null;
  if (!hitbox || !Number.isFinite(hitbox.width) || !Number.isFinite(hitbox.height)) return null;
  if (hitbox.width <= 0 || hitbox.height <= 0) return null;
  const offsetX = Number.isFinite(hitbox.offsetX) ? hitbox.offsetX : 0;
  const offsetY = Number.isFinite(hitbox.offsetY) ? hitbox.offsetY : 0;
  return {
    x: offsetX - hitbox.width / 2,
    y: offsetY - hitbox.height / 2,
    width: hitbox.width,
    height: hitbox.height,
  };
}

function getPlayerRushHitboxLocalRect(targetPlayer = player) {
  if (!targetPlayer) return null;
  const rushHitbox = targetPlayer.config?.rushHitbox || PLAYER_CONFIG?.rushHitbox || null;
  if (!rushHitbox || !Number.isFinite(rushHitbox.width) || !Number.isFinite(rushHitbox.height)) return null;
  if (rushHitbox.width <= 0 || rushHitbox.height <= 0) return null;
  const offsetX = Number.isFinite(rushHitbox.offsetX) ? rushHitbox.offsetX : 0;
  const offsetY = Number.isFinite(rushHitbox.offsetY) ? rushHitbox.offsetY : 0;
  return {
    x: offsetX - rushHitbox.width / 2,
    y: offsetY - rushHitbox.height / 2,
    width: rushHitbox.width,
    height: rushHitbox.height,
  };
}

function queueBasicMeleeAttack(dir, meleeAttackState) {
  if (!player || !meleeAttackState || !dir) return;
  meleeAttackState.pendingBasicAttack = {
    dir: { x: dir.x, y: dir.y },
    queuedAt:
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now(),
    hitApplied: false,
  };
}

function resolveQueuedBasicMeleeAttack(meleeAttackState) {
  if (!player || !meleeAttackState?.pendingBasicAttack) return;
  const pending = meleeAttackState.pendingBasicAttack;
  const animator = player.animator;
  const clip = animator?.currentClip || null;
  if (!animator || player.state !== "attackMelee" || animator.currentName !== "attackMelee" || !clip) return;
  const logicalFrames =
    Array.isArray(clip.frameMap) && clip.frameMap.length
      ? clip.frameMap.length
      : clip.frameCount || 1;
  const requiredFrame = Math.max(
    1,
    Math.min(
      logicalFrames,
      Number.isFinite(player.config?.attackHitFrame) ? Math.round(player.config.attackHitFrame) : DEFAULT_PLAYER_ATTACK_HIT_FRAME,
    ),
  );
  const currentFrame = (Number.isFinite(animator.frameIndex) ? animator.frameIndex : 0) + 1;
  if (pending.hitApplied || currentFrame < requiredFrame) return;
  pending.hitApplied = true;
  const angleRad = Math.atan2(pending.dir.y, pending.dir.x);
  const swingCenterX = player.x + Math.cos(angleRad) * MELEE_OFFSET;
  const swingCenterY = player.y + Math.sin(angleRad) * MELEE_OFFSET;
  executeBasicMeleeAttack(pending.dir, meleeAttackState, swingCenterX, swingCenterY);
  meleeAttackState.pendingBasicAttack = null;
}

function circleIntersectsRect(cx, cy, radius, rect) {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.height));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= radius * radius;
}

function closestPointOnSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const abLenSq = abx * abx + aby * aby;
  if (abLenSq <= 1e-6) return { x: ax, y: ay, t: 0 };
  const apx = px - ax;
  const apy = py - ay;
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));
  return {
    x: ax + abx * t,
    y: ay + aby * t,
    t,
  };
}

class Projectile {
  constructor(type, config, clip, x, y, dx, dy) {
    this.type = type;
    this.config = config;
    this.x = x;
    this.y = y;
    const direction = normalizeVector(dx, dy);
    const projectorSpeed = Number.isFinite(config.speed)
      ? config.speed
      : Math.hypot(direction.x, direction.y);
    this.speed = Math.max(0, projectorSpeed);
    this.vx = direction.x * this.speed;
    this.vy = direction.y * this.speed;
    this.rotation = Math.atan2(this.vy, this.vx);
    this.priority = config.priority ?? 0;
    this.life = config.life ?? 5;
    this.radius = config.radius;
    this.pierce = Boolean(config.pierce);
    this.maxBossHits = Number.isFinite(config.maxBossHits) && config.maxBossHits > 1 ? Math.round(config.maxBossHits) : 1;
    this.bossHitCooldown = Number.isFinite(config.bossHitCooldown) && config.bossHitCooldown > 0 ? config.bossHitCooldown : 0;
    this.bossHitCount = 0;
    this.bossHitTimer = 0;
    this.dead = false;
    this.damage = config.damage ?? 0;
    this.scale = config.scale || 1;
    this.flipHorizontal = Boolean(config.flipHorizontal);
    this.loopFrames = Boolean(config.loopFrames);
    this.onImpact = config.onImpact || null;
    this.onExpire = config.onExpire || null;
    this.onDestroyed = config.onDestroyed || null;
    this.onImpactTriggered = false;
    this.onExpireTriggered = false;
    this.onDestroyedTriggered = false;
    this.friendly = config.friendly ?? true;
    this.visualOnly = Boolean(config.visualOnly);
    this.lightSpreadShot = Boolean(config.lightSpreadShot);
    this.collisionDisabled = Boolean(config.collisionDisabled);
    this.damageType = config.damageType || null;
    this.source = config.source || null;
    this.hitEntities = new Set();
    this.maxDurability = Math.max(0, Number(config.durabilityHealth) || 0);
    this.durability = this.maxDurability;
    this.durabilityDamagePerHit = Math.max(1, Number(config.durabilityDamagePerHit) || 10);
    this.homingTarget = config.homingTarget || null;
    this.homingDuration = Math.max(0, config.homingDuration || 0);
    this.homingStrength = Math.max(0, config.homingStrength ?? 0);
    this.isDivineShot = Boolean(config.isDivineShot);
    this.fireThrowerBomb = Boolean(config.fireThrowerBomb);
    this.fireThrowerBombState = this.fireThrowerBomb ? "flight" : null;
    this.fireThrowerFlightTimer = Math.max(0, Number(config.flightDuration) || 0);
    this.fireThrowerArmedTimer = Math.max(0, Number(config.armedDuration) || 0);
    this.fireThrowerArmedFrames = Array.isArray(config.armedFrames) ? config.armedFrames : null;
    this.fireThrowerFlightFrames = Array.isArray(config.frames) ? config.frames.slice() : null;
    this.fireThrowerVisualLift = this.fireThrowerBomb ? Math.max(58, (this.radius || 18) * 3.8) : 0;
    this.fireThrowerSpawnCount = Math.max(1, Number(config.fireThrowerSpawnCount) || 5);
    this.fireThrowerLandingDamage = Math.max(0, Number(config.fireThrowerLandingDamage) || 0);
    this.fireThrowerLandingRadius = Math.max(
      this.radius || 0,
      Number(config.fireThrowerLandingRadius) || (this.radius || 0),
    );
    const extractedFrames =
      this.fireThrowerBomb &&
      (!Array.isArray(config.frames) || !config.frames.length) &&
      clip?.image &&
      Number.isFinite(clip.frameWidth) &&
      Number.isFinite(clip.frameHeight) &&
      clip.frameWidth > 0 &&
      clip.frameHeight > 0 &&
      typeof getFramesForClip === "function"
        ? getFramesForClip(clip)
        : null;
    const resolvedFrames =
      Array.isArray(config.frames) && config.frames.length
        ? config.frames
        : (Array.isArray(extractedFrames) && extractedFrames.length ? extractedFrames : null);
    if (resolvedFrames && resolvedFrames.length) {
      this.frames = resolvedFrames;
      this.frameDuration = config.frameDuration || 0.05;
      this.frameTimer = 0;
      this.frameIndex = 0;
      this.animator = null;
    } else {
      this.frames = null;
      this.animator = new Animator({ fly: clip }, this.scale);
      this.animator.play("fly");
    }
  }

  update(dt) {
    if (this.fireThrowerBomb) {
      if (this.fireThrowerBombState === "flight") {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.fireThrowerFlightTimer = Math.max(0, this.fireThrowerFlightTimer - dt);
        if (this.frames && this.frames.length) {
          this.frameTimer += dt;
          const frameDuration = this.frameDuration > 0 ? this.frameDuration : 0.05;
          while (this.frameTimer >= frameDuration) {
            this.frameTimer -= frameDuration;
            this.frameIndex = (this.frameIndex + 1) % this.frames.length;
          }
        }
        if (this.fireThrowerFlightTimer <= 0) {
          this.fireThrowerBombState = "armed";
          this.collisionDisabled = true;
          this.vx = 0;
          this.vy = 0;
          this.speed = 0;
          this.rotation = 0;
          this.life = Math.max(this.life, this.fireThrowerArmedTimer);
          const landingDamage = Math.max(0, this.fireThrowerLandingDamage || 0);
          const landingRadius = Math.max(this.radius || 0, this.fireThrowerLandingRadius || 0);
          if (landingDamage > 0) {
            if (
              player &&
              player.state !== "death" &&
              circleIntersectsPlayerHurtbox(this.x, this.y, landingRadius, player)
            ) {
              if (player.invulnerableTimer <= 0) {
                player.takeDamage(landingDamage);
              }
            }
            if (Array.isArray(npcs) && npcs.length) {
              for (const npc of npcs) {
                if (!npc || !npc.active || npc.departed) continue;
                const npcRadius = npc.radius || NPC_RADIUS || 0;
                const dx = (npc.x || 0) - this.x;
                const dy = (npc.y || 0) - this.y;
                if (Math.hypot(dx, dy) > landingRadius + npcRadius * 0.7) continue;
                if (typeof npc.sufferAttack === "function") {
                  npc.sufferAttack(landingDamage, { sourceType: this.source?.type || "miniDemonFireThrower" });
                }
              }
            }
          }
          if (this.fireThrowerArmedFrames?.length) {
            this.frames = this.fireThrowerArmedFrames;
            this.frameIndex = 0;
            this.frameTimer = 0;
            this.loopFrames = true;
            this.frameDuration = 0.06;
          }
          if (typeof spawnFlashEffect === "function") {
            spawnFlashEffect(this.x, this.y);
          }
          if (typeof spawnPuffEffect === "function") {
            spawnPuffEffect(this.x, this.y, Math.max(18, (this.radius || 16) * 1.2), {
              tintColor: "#ffb347",
              tintAlpha: 0.42,
            });
          }
        }
      } else if (this.fireThrowerBombState === "armed") {
        this.fireThrowerArmedTimer = Math.max(0, this.fireThrowerArmedTimer - dt);
        this.life = this.fireThrowerArmedTimer;
        if (this.frames && this.frames.length) {
          this.frameTimer += dt;
          const frameDuration = this.frameDuration > 0 ? this.frameDuration : 0.06;
          while (this.frameTimer >= frameDuration) {
            this.frameTimer -= frameDuration;
            this.frameIndex = (this.frameIndex + 1) % this.frames.length;
          }
        }
        if (this.fireThrowerArmedTimer <= 0) {
          if (typeof spawnSentryBeamHitEffect === "function") {
            spawnSentryBeamHitEffect(this.x, this.y);
          } else if (typeof spawnFlashEffect === "function") {
            spawnFlashEffect(this.x, this.y);
          }
          const missileCount = 5;
          for (let i = 0; i < missileCount; i += 1) {
            const angle = (Math.PI * 2 * i) / missileCount - Math.PI / 2;
            const dirX = Math.cos(angle);
            const dirY = Math.sin(angle);
            const projectile = spawnProjectile("fire", this.x, this.y, dirX, dirY, {
              friendly: false,
              source: this.source || null,
              damage: Math.max(1, Math.round(this.config?.damage || 2)),
              speed: (PROJECTILE_CONFIG.fire?.speed || 420) * 0.92,
              radius: PROJECTILE_CONFIG.fire?.radius || 18,
              scale: 0.95,
              frames: Array.isArray(projectileFrames.fire) ? projectileFrames.fire : undefined,
              frameDuration: 0.05,
              loopFrames: true,
            });
            if (projectile) {
              projectile.hitEntities.add(this.source || this);
            }
          }
          if (this.onExpire && !this.onExpireTriggered) {
            this.onExpireTriggered = true;
            this.onExpire(this);
          }
          this.dead = true;
        }
      }
      return;
    }
    if (this.homingTarget) {
      if (this.homingTarget.dead || this.homingTarget.departed) {
        this.homingTarget = null;
      } else if (this.homingDuration > 0 && this.homingStrength > 0) {
        const targetDir = normalizeVector(
          this.homingTarget.x - this.x,
          this.homingTarget.y - this.y,
        );
        const currentDir = normalizeVector(this.vx, this.vy);
        const blend = Math.min(1, this.homingStrength * dt);
        const combinedDir = normalizeVector(
          currentDir.x * (1 - blend) + targetDir.x * blend,
          currentDir.y * (1 - blend) + targetDir.y * blend,
        );
        const currentSpeed = this.speed || Math.hypot(this.vx, this.vy);
        if ((combinedDir.x !== 0 || combinedDir.y !== 0) && currentSpeed > 0) {
          this.vx = combinedDir.x * currentSpeed;
          this.vy = combinedDir.y * currentSpeed;
          this.rotation = Math.atan2(this.vy, this.vx);
        }
        this.homingDuration = Math.max(0, this.homingDuration - dt);
        if (this.homingDuration <= 0) {
          this.homingTarget = null;
        }
      }
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.bossHitTimer > 0) this.bossHitTimer = Math.max(0, this.bossHitTimer - dt);

    if (this.frames && this.frames.length) {
      this.frameTimer += dt;
      const frameDuration = this.frameDuration > 0 ? this.frameDuration : 0.05;
      this.frameDuration = frameDuration;
      while (this.frameTimer >= frameDuration) {
        this.frameTimer -= frameDuration;
        if (this.loopFrames) {
          this.frameIndex = (this.frameIndex + 1) % this.frames.length;
        } else if (this.frameIndex < this.frames.length - 1) {
          this.frameIndex += 1;
        } else {
          this.frameIndex = this.frames.length - 1;
          break;
        }
      }
    } else if (this.animator) {
      this.animator.update(dt);
    }

    const bossStage =
      this.friendly &&
      this.source?.isPlayer &&
      levelManager?.getStatus &&
      ["bossIntro", "bossActive"].includes(levelManager.getStatus().stage);
    const bossRangeMultiplier = bossStage ? 1.5 : 1;
    const extraX = canvas.width * (bossRangeMultiplier - 1) * 0.5;
    const extraY = canvas.height * (bossRangeMultiplier - 1) * 0.5;
    const outLeft = this.x < -this.radius - extraX;
    const outRight = this.x > canvas.width + this.radius + extraX;
    const outTop = this.y < -this.radius - extraY;
    const outBottom = this.y > canvas.height + this.radius + extraY;
    if (outLeft || outRight || outTop || outBottom) {
      if (isBossProjectile(this)) {
        const clampedX = Math.max(0, Math.min(canvas.width, this.x));
        const clampedY = Math.max(0, Math.min(canvas.height, this.y));
        const radius = this.radius || this.config?.radius || 40;
        spawnBossProjectilePuffEffect(clampedX, clampedY, { radius: radius * 2 });
      }
      this.dead = true;
    }

    if (this.life <= 0) {
      if (this.onExpire && !this.onExpireTriggered) {
        this.onExpireTriggered = true;
        this.onExpire(this);
      }
      this.dead = true;
    }
  }

  onHit(target) {
    if (this.onImpact && !this.onImpactTriggered) {
      this.onImpactTriggered = true;
      this.onImpact(this, target);
    }
    if (this.isDivineShot) {
      this.homingTarget = null;
      this.homingDuration = 0;
      this.homingStrength = 0;
    }
    if (!this.pierce) this.dead = true;
  }

  hitTest(enemy) {
    if (enemy?.isPlayer) {
      const playerHitbox = getPlayerHitboxRect(enemy);
      if (playerHitbox) {
        const radius = Math.max(0, this.radius || 0);
        return circleIntersectsRect(this.x, this.y, radius, playerHitbox);
      }
    }
    const hitbox = getEnemyHitboxRect(enemy);
    if (hitbox) {
      const radius = Math.max(0, this.radius || 0);
      return circleIntersectsRect(this.x, this.y, radius, hitbox);
    }
    const center = getEnemyHitboxCenter(enemy);
    const dx = center.x - this.x;
    const dy = center.y - this.y;
    const distance = Math.hypot(dx, dy);
    const threshold = this.radius + getEnemyHitboxRadius(enemy) * 0.6;
    return distance <= threshold;
  }

  getDamage() {
    return this.damage;
  }

  draw() {
    const fadeAlpha =
      this.type === "word_of_god"
        ? Math.max(0, Math.min(1, this.life / 0.2))
        : 1;
    if (this.lightSpreadShot) {
      drawLightTracerProjectile(this, fadeAlpha);
      return;
    }
    const shouldGlow = this.friendly || this.type === "miniTrident";
    if (this.frames) {
      const frame = this.frames[this.frameIndex];
      if (!frame) return;
      const width = frame.width * this.scale;
      const height = frame.height * this.scale;
      let drawY = this.y;
      let projectileAlpha = fadeAlpha;
      if (this.fireThrowerBomb) {
        const groundRadius = Math.max(12, (this.radius || 16) * 0.95);
        ctx.save();
        ctx.translate(this.x, this.y + Math.max(4, groundRadius * 0.15));
        if (this.fireThrowerBombState === "flight") {
          const total = Math.max(0.001, Number(this.config.flightDuration) || 0.58);
          const progress = 1 - Math.max(0, this.fireThrowerFlightTimer) / total;
          const shadowScale = 0.62 + Math.sin(progress * Math.PI) * 0.45;
          ctx.fillStyle = "rgba(18, 10, 6, 0.18)";
          ctx.beginPath();
          ctx.ellipse(0, 0, groundRadius * shadowScale, groundRadius * 0.45 * shadowScale, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (this.fireThrowerBombState === "armed") {
          ctx.fillStyle = "rgba(18, 10, 6, 0.26)";
          ctx.beginPath();
          ctx.ellipse(0, 0, groundRadius, groundRadius * 0.52, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(255, 186, 84, 0.62)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(0, 0, groundRadius * 1.12, groundRadius * 0.6, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
        if (this.fireThrowerBombState === "flight") {
          const total = Math.max(0.001, Number(this.config.flightDuration) || 0.58);
          const progress = 1 - Math.max(0, this.fireThrowerFlightTimer) / total;
          drawY = this.y - Math.sin(progress * Math.PI) * this.fireThrowerVisualLift;
        } else if (this.fireThrowerBombState === "armed") {
          const blinkWindow = Math.min(0.55, Math.max(0.1, (this.config.armedDuration || 1.35) * 0.45));
          if (this.fireThrowerArmedTimer <= blinkWindow) {
            const blinkT = this.fireThrowerArmedTimer <= 0 ? 0 : this.fireThrowerArmedTimer;
            const blinkRate = this.fireThrowerArmedTimer <= blinkWindow * 0.5 ? 22 : 13;
            const blinkPulse = 0.55 + 0.45 * Math.abs(Math.sin((blinkWindow - blinkT) * blinkRate));
            projectileAlpha *= blinkPulse;
          }
        }
      }
      ctx.save();
      ctx.translate(this.x, drawY);
      if (this.flipHorizontal) {
        ctx.rotate(this.rotation + Math.PI);
        ctx.scale(-1, 1);
      } else {
        ctx.rotate(this.rotation);
      }
      if (projectileAlpha < 1) ctx.globalAlpha *= projectileAlpha;
      if (shouldGlow) {
        let glowOptions = undefined;
        let suppressGlow = false;
        if (this.type === "faith_cannon") {
          glowOptions = { radiusScale: 0.2, baseAlpha: 0.12 };
        }
        if (!suppressGlow) drawProjectileGlow(width, height, glowOptions);
      }
      ctx.drawImage(frame, -width / 2, -height / 2, width, height);
      ctx.restore();
    } else if (this.animator) {
      // Special handling for divine shot - draw as glowing golden orb
      if (this.type === "divine_shot") {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Overlay the melee swoosh sprite for charged shots.
        const swooshImg = assets?.effects?.meleeSwoosh;
        if (swooshImg) {
          const targetWidth = MELEE_SWING_LENGTH_BASE * WORLD_SCALE;
          const scale = targetWidth / Math.max(1, swooshImg.width);
          const targetHeight = swooshImg.height * scale * MELEE_SWOOSH_ARC_SCALE;
          ctx.save();
          ctx.rotate(this.rotation || 0);
          ctx.globalAlpha = 0.85 * fadeAlpha;
          ctx.drawImage(
            swooshImg,
            -targetWidth / 2,
            -targetHeight / 2,
            targetWidth,
            targetHeight,
          );
          ctx.restore();
        }

        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        if (fadeAlpha < 1) ctx.globalAlpha *= fadeAlpha;
        if (shouldGlow) {
          let glowOptions = undefined;
          let suppressGlow = false;
          if (this.type === "faith_cannon") {
            glowOptions = { radiusScale: 0.2, baseAlpha: 0.12 };
          }
          if (!suppressGlow) {
            const size = (this.radius || 18) * 2.2;
            drawProjectileGlow(size, size, glowOptions);
          }
        }
        ctx.restore();
        this.animator.draw(ctx, this.x, this.y, {
          rotation: this.rotation,
          scale: this.scale,
          alpha: fadeAlpha,
        });
      }
    }
  }
}

function applyProjectileDurabilityDamage(projectile, amount = null) {
  if (!projectile || projectile.dead) return true;
  if (!Number.isFinite(projectile.durability) || projectile.durability <= 0) {
    if (projectile.onDestroyed && !projectile.onDestroyedTriggered) {
      projectile.onDestroyedTriggered = true;
      projectile.onDestroyed(projectile);
    }
    projectile.dead = true;
    return true;
  }
  const damage = Math.max(
    1,
    Number.isFinite(amount) ? amount : projectile.durabilityDamagePerHit || 10,
  );
  projectile.durability = Math.max(0, projectile.durability - damage);
  if (projectile.durability <= 0) {
    if (projectile.onDestroyed && !projectile.onDestroyedTriggered) {
      projectile.onDestroyedTriggered = true;
      projectile.onDestroyed(projectile);
    }
    projectile.dead = true;
    return true;
  }
  return false;
}

function getPlayerProjectileDeflectDamage(meleeAttackState) {
  if (!meleeAttackState) return MELEE_BASE_DAMAGE;
  if (meleeAttackState.isRushing || meleeAttackState.rushDamageEnabled) {
    return RUSH_DAMAGE;
  }
  if (meleeAttackState.spinTimer > 0) {
    return Math.round(MELEE_BASE_DAMAGE * MELEE_SPIN_DAMAGE_MULTIPLIER);
  }
  if (meleeAttackState.swooshTimer > 0) {
    return Math.round(MELEE_BASE_DAMAGE * MELEE_SWOOSH_DAMAGE_SCALE);
  }
  return MELEE_BASE_DAMAGE;
}

let projectileGlowSprite = null;

function getProjectileGlowSprite() {
  if (projectileGlowSprite) return projectileGlowSprite;
  if (typeof document === "undefined") return null;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const localCtx = canvas.getContext("2d");
  if (!localCtx) return null;
  const center = size / 2;
  const gradient = localCtx.createRadialGradient(center, center, 2, center, center, center);
  gradient.addColorStop(0, "rgba(255, 222, 140, 0.32)");
  gradient.addColorStop(0.45, "rgba(255, 190, 110, 0.18)");
  gradient.addColorStop(0.75, "rgba(255, 170, 95, 0.08)");
  gradient.addColorStop(1, "rgba(255, 160, 80, 0)");
  localCtx.fillStyle = gradient;
  localCtx.beginPath();
  localCtx.arc(center, center, center, 0, Math.PI * 2);
  localCtx.fill();
  projectileGlowSprite = canvas;
  return projectileGlowSprite;
}

function drawProjectileGlow(
  width,
  height,
  { radiusScale = 0.95, baseAlpha = 0.2, pulseScale = 0.25, colorCenter, colorMid, colorEdge } = {},
) {
  const pulse = (Math.sin(performance.now() * 0.025) + 1) / 2;
  const alpha = baseAlpha + pulseScale * pulse;
  const radius = Math.max(width, height) * radiusScale;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "lighter";
  if (colorCenter || colorMid || colorEdge) {
    const gradient = ctx.createRadialGradient(0, 0, 2, 0, 0, radius);
    gradient.addColorStop(0, colorCenter || "rgba(255, 222, 140, 0.32)");
    gradient.addColorStop(0.45, colorMid || "rgba(255, 190, 110, 0.18)");
    gradient.addColorStop(0.75, "rgba(255, 170, 95, 0.08)");
    gradient.addColorStop(1, colorEdge || "rgba(255, 160, 80, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const sprite = getProjectileGlowSprite();
    const drawSize = radius * 2;
    if (sprite) {
      ctx.drawImage(sprite, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
    }
  }
  ctx.restore();
}

function drawLightTracerProjectile(projectile, fadeAlpha = 1) {
  if (!projectile) return;
  const vx = Number(projectile.vx) || 0;
  const vy = Number(projectile.vy) || 0;
  const speed = Math.max(1, Math.hypot(vx, vy));
  const dirX = vx / speed;
  const dirY = vy / speed;
  const len = Math.max(18, Math.min(40, (projectile.radius || 10) * 2.1));
  const halfW = Math.max(0.8, (projectile.radius || 8) * 0.14);
  const x = projectile.x || 0;
  const y = projectile.y || 0;
  const tailX = x - dirX * len;
  const tailY = y - dirY * len;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha *= Math.max(0, Math.min(1, fadeAlpha));
  const outer = ctx.createLinearGradient(tailX, tailY, x, y);
  outer.addColorStop(0, "rgba(120, 200, 255, 0.00)");
  outer.addColorStop(0.26, "rgba(135, 218, 255, 0.30)");
  outer.addColorStop(1, "rgba(215, 245, 255, 0.96)");
  ctx.strokeStyle = outer;
  ctx.lineCap = "round";
  ctx.lineWidth = halfW * 2.4;
  ctx.shadowColor = "rgba(150, 225, 255, 0.96)";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(x, y);
  ctx.stroke();
  const inner = ctx.createLinearGradient(tailX, tailY, x, y);
  inner.addColorStop(0, "rgba(215, 245, 255, 0.00)");
  inner.addColorStop(0.34, "rgba(220, 248, 255, 0.50)");
  inner.addColorStop(1, "rgba(250, 255, 255, 1.00)");
  ctx.strokeStyle = inner;
  ctx.lineWidth = halfW * 0.9;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.restore();
}

class BossEncounter {
  constructor({ level = 1, type = chooseBossType(level) } = {}) {
    this.level = level;
    this.type = type;
    this.config = ENEMY_TYPES[this.type];
    const clipBundle = resolveBossClips(this.type);
    this.clips = clipBundle?.clips || null;
    this.visualType = clipBundle?.key || this.type;
    this.usingFallbackClips = Boolean(clipBundle?.fallback);
    if (!this.config || !this.clips) {
      if (!this.config) {
        logBossSpriteIssue({ reason: "missing-boss-config", requestedType: this.type });
      }
      if (!this.clips) {
        logBossSpriteIssue({ reason: "missing-boss-clips-after-fallback", requestedType: this.type });
      }
      this.invalid = true;
      return;
    }
    this.scale = this.config.scale;
    const maxRadius = 420 * WORLD_SCALE;
    this.radius = Math.min(maxRadius, this.config.hitRadius || 28);
    const baseHitbox = this.config.hitbox || null;
    this.hitbox = baseHitbox ? {
      width: baseHitbox.width,
      height: baseHitbox.height,
      offsetX: baseHitbox.offsetX || 0,
      offsetY: baseHitbox.offsetY || 0,
    } : null;
    this.animator = new Animator(this.clips, this.scale);
    this.animator.play("idle");
    this.state = "idle";
    this.facing = "down";
    this.maxHealth = this.config.health || 300;
    this.health = this.maxHealth;
    this.phase = 1;
    this.phaseNotified = { 2: false, 3: false };
    this.projectileTimer = 1.5;
    this.summonTimer = 7.5;
    this.hazardTimer = 9;
    this.touchCooldown = 0;
    this.dead = false;
    this.defeated = false;
    this.removed = false;
    this.deathNotified = false;
    this.ignoreObstacles = true;
    this.shieldHitCooldown = 0;
    this.tauntCooldown = 0;
    this.deathExplosionTimer = 0;
    this.deathExplosionAccumulator = 0;
    this.deathPostDelay = 0;
    this.deathVisualTotal = 0;
    this.deathGraceRainTimer = 0;
    this.deathGraceRainInterval = 0.22;
    this.deathStageNotified = false;
    this.victoryAnnounced = false;
    this.safeTopMargin = Math.max(this.radius * 0.8, 160);
    const spawnX = Math.max(this.radius + 20, canvas.width - this.radius - 36 - 200);
    const playfieldCenterY = HUD_HEIGHT + (canvas.height - HUD_HEIGHT) / 2;
    const spawnY = Math.max(
      HUD_HEIGHT + this.safeTopMargin,
      Math.min(canvas.height - this.safeTopMargin, playfieldCenterY - 150),
    );
    this.x = spawnX;
    this.y = spawnY;
    clampEntityToBounds(this);
    this.spawnIntro = {
      active: true,
      timer: 0,
      precursorDuration: 1.25,
      frameDuration: 0.09,
      frameCount: 5,
      opaqueByFrame: 4,
      // Oversize to cover spawn location and make the teleport feel explosive.
      explosionSize: Math.max(760, this.scale * 56),
      // Tune where the final mushroom cloud "sits" on the ground line.
      // Lower ratio plants it deeper (visibly lower) without affecting precursor bursts.
      mainExplosionGroundRatio: 0.86,
      // Positive values move the main mushroom cloud down toward the ground line.
      mainExplosionOffsetY: 88,
      bossAlpha: 0,
      events: [
        {
          key: "enemyDeathExplosionAlt2",
          startTime: 0.00,
          duration: 0.30,
          frameDuration: 0.05,
          size: 210,
          offsetX: -96,
          offsetY: 6,
          sfxPlayed: false,
        },
        {
          key: "enemyDeathExplosionAlt",
          startTime: 0.08,
          duration: 0.30,
          frameDuration: 0.05,
          size: 220,
          offsetX: -56,
          offsetY: 8,
          sfxPlayed: false,
        },
        {
          key: "enemyDeathExplosionAlt2",
          startTime: 0.14,
          duration: 0.30,
          frameDuration: 0.05,
          size: 230,
          offsetX: 12,
          offsetY: 8,
          sfxPlayed: false,
        },
        {
          key: "enemyDeathExplosionAlt",
          startTime: 0.22,
          duration: 0.32,
          frameDuration: 0.05,
          size: 240,
          offsetX: 72,
          offsetY: 6,
          sfxPlayed: false,
        },
        {
          key: "enemyDeathExplosionAlt2",
          startTime: 0.30,
          duration: 0.32,
          frameDuration: 0.05,
          size: 250,
          offsetX: -124,
          offsetY: 4,
          sfxPlayed: false,
        },
        {
          key: "enemyDeathExplosionAlt",
          startTime: 0.38,
          duration: 0.32,
          frameDuration: 0.05,
          size: 260,
          offsetX: -14,
          offsetY: 10,
          sfxPlayed: false,
        },
        {
          key: "enemyDeathExplosionAlt2",
          startTime: 0.46,
          duration: 0.34,
          frameDuration: 0.05,
          size: 270,
          offsetX: 102,
          offsetY: 4,
          sfxPlayed: false,
        },
        {
          key: "enemyDeathExplosionAlt",
          startTime: 0.54,
          duration: 0.34,
          frameDuration: 0.05,
          size: 280,
          offsetX: -78,
          offsetY: 8,
          sfxPlayed: false,
        },
        {
          key: "enemyDeathExplosionAlt2",
          startTime: 0.62,
          duration: 0.34,
          frameDuration: 0.05,
          size: 290,
          offsetX: 28,
          offsetY: 10,
          sfxPlayed: false,
        },
        {
          key: "enemyDeathExplosionAlt",
          startTime: 0.70,
          duration: 0.34,
          frameDuration: 0.05,
          size: 300,
          offsetX: 136,
          offsetY: 2,
          sfxPlayed: false,
        },
        {
          key: "enemyDeathExplosionAlt2",
          startTime: 0.78,
          duration: 0.34,
          frameDuration: 0.05,
          size: 310,
          offsetX: -146,
          offsetY: 2,
          sfxPlayed: false,
        },
        {
          key: "enemyDeathExplosionAlt",
          startTime: 0.86,
          duration: 0.34,
          frameDuration: 0.05,
          size: 320,
          offsetX: -40,
          offsetY: 8,
          sfxPlayed: false,
        },
        {
          key: "enemyDeathExplosionAlt2",
          startTime: 0.94,
          duration: 0.34,
          frameDuration: 0.05,
          size: 340,
          offsetX: 54,
          offsetY: 4,
          sfxPlayed: false,
        },
        {
          key: "enemyDeathExplosionAlt",
          startTime: 1.02,
          duration: 0.34,
          frameDuration: 0.05,
          size: 360,
          offsetX: 0,
          offsetY: 6,
          sfxPlayed: false,
        },
      ],
    };
    this.animator.play("idle");
  }

  getHpBarMetrics() {
    const baseOffset = 130;
    const name = this.config?.displayName || "";
    const offsetY = name === "High Demon" ? baseOffset - 25 : baseOffset;
    return {
      width: 260,
      height: 18,
      offsetY,
    };
  }

  isActive() {
    return !this.invalid && !this.removed;
  }

  getSpeed() {
    const base = this.config.speed || 120;
    if (this.phase === 1) return base * 0.55;
    if (this.phase === 2) return base * 0.75;
    return base * 1.05;
  }

  getProjectileCooldown() {
    if (this.phase === 1) return 2.4;
    if (this.phase === 2) return 1.6;
    return 1.1;
  }

  getSummonCooldown() {
    if (this.phase === 2) return 10;
    return 7;
  }

  getHazardCooldown() {
    return Math.max(5, 7.5 - this.level * 0.4);
  }

  moveTowardPlayer(dt) {
    if (!player) return;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.hypot(dx, dy);
    if (distance === 0) return;
    const speed = this.getSpeed();
    const nx = dx / distance;
    const ny = dy / distance;
    const maintainDistance = this.phase === 1 ? 140 : 100;
    if (distance > maintainDistance) {
      this.x += nx * speed * dt;
      this.y += ny * speed * dt;
    } else if (distance < maintainDistance * 0.7) {
      this.x -= nx * speed * dt * 0.5;
      this.y -= ny * speed * dt * 0.5;
    }
    resolveEntityObstacles(this);
    clampEntityToBounds(this);
    this.updateFacing(nx, ny);
    if (this.state !== "attack" && this.state !== "hurt") {
      if (this.state !== "walk") {
        this.state = "walk";
        this.animator.play("walk");
      }
    }
  }

  updateFacing(nx, ny) {
    if (Math.abs(nx) > Math.abs(ny)) {
      this.facing = nx >= 0 ? "right" : "left";
    } else {
      this.facing = ny >= 0 ? "down" : "up";
    }
  }

  getProjectileType() {
    const catalogDef =
      window.BattlechurchEnemyCatalog?.catalog?.[this.type] ||
      window.BattlechurchEnemyDefinitions?.[this.type] ||
      null;
    if (catalogDef?.projectileType) return catalogDef.projectileType;
    if (this.type === "miniDemonLord") return "fire";
    if (this.phase === 1) return "arrow";
    return "fire";
  }

  getProjectileDamage() {
    if (this.phase === 1) return 0.8;
    if (this.phase === 2) return 1.0;
    return 1.4;
  }

  performProjectileAttack() {
    if (!player) return;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dir = normalizeVector(dx, dy);
    const type = this.getProjectileType();
    const base = PROJECTILE_CONFIG[type] || {};
    const isDemonLord = this.type === "miniDemonLord";
    const speedMultiplier = isDemonLord
      ? this.phase === 1 ? 0.58 : this.phase === 2 ? 0.64 : 0.72
      : this.phase === 1 ? 0.85 : this.phase === 2 ? 1.05 : 1.2;
    const projectileFramesOverride = isDemonLord ? projectileFrames.demonLordFireball : null;
    const projectile = spawnProjectile(type, this.x, this.y, dir.x, dir.y, {
      friendly: false,
      speed: (base.speed || 420) * speedMultiplier,
      damage: isDemonLord ? 5 : this.getProjectileDamage(),
      radius: isDemonLord ? Math.max(base.radius || 28, 34) : base.radius || 28,
      durabilityHealth: isDemonLord ? 20 : undefined,
      durabilityDamagePerHit: isDemonLord ? 10 : undefined,
      frames: Array.isArray(projectileFramesOverride) && projectileFramesOverride.length
        ? projectileFramesOverride
        : undefined,
      frameDuration: isDemonLord ? 0.055 : undefined,
      scale: isDemonLord ? 1.2 : undefined,
      source: this,
    });
    if (projectile) {
      if (typeof playFireballCastSfx === "function") {
        playFireballCastSfx(isDemonLord ? 0.85 : 0.7);
      }
      this.state = "attack";
      this.animator.play("attack", { restart: true });
    }
  }

  summonMinions() {
    const minionType = "miniFireImp";
    const count = Math.min(3, 2 + Math.floor(this.level / 2));
    if (enemies.length >= MAX_ACTIVE_ENEMIES + 2) return;
    for (let i = 0; i < count; i += 1) {
      const offset = randomInRange(60, 140);
      const angle = Math.random() * Math.PI * 2;
      spawnEnemyOfType(minionType, {
        x: this.x + Math.cos(angle) * offset,
        y: this.y + Math.sin(angle) * offset,
      });
    }
  }

  spawnHazard() {
    if (this.phase < 3) {
      const targetX = player ? player.x : this.x;
      const targetY = player ? player.y : this.y;
      const angle = Math.random() * Math.PI * 2;
      const distance = randomInRange(80, 180);
      const x = Math.max(
        this.radius,
        Math.min(canvas.width - this.radius, targetX + Math.cos(angle) * distance),
      );
      const y = Math.max(
        HUD_HEIGHT + this.radius,
        Math.min(canvas.height - this.radius, targetY + Math.sin(angle) * distance),
      );
      const radius = 120 + this.phase * 30;
      const hazardDamage = this.phase >= 2 ? 2 : 1;
      bossHazards.push(new BossHazard(x, y, radius, 3.5, { damage: hazardDamage }));
      spawnMagicImpactEffect(x, y - radius / 4);
      return;
    }

    const fanCount = 6;
    for (let i = 0; i < fanCount; i += 1) {
      const angle = (Math.PI * 2 * i) / fanCount;
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);
      const projectile = spawnProjectile("fire", this.x, this.y, dirX, dirY, {
        friendly: false,
        speed: PROJECTILE_CONFIG.fire.speed * 1.1,
        damage: 1.2,
        radius: PROJECTILE_CONFIG.fire.radius,
        source: this,
      });
      if (projectile) {
        projectile.hitEntities.add(this);
      }
    }
  }

  applyContactDamage() {
    if (!player || player.state === "death") return;
    if (!circleIntersectsPlayerHurtbox(this.x, this.y, this.radius, player)) return;
    if (this.touchCooldown > 0) return;
    if (player.invulnerableTimer > 0) {
      this.touchCooldown = Math.max(this.touchCooldown, 0.35);
      return;
    }
    if (player.shieldTimer > 0) {
      applyShieldImpact(this);
      this.touchCooldown = Math.max(this.touchCooldown, SHIELD_LARGE_COOLDOWN);
      return;
    }
    const damage = this.phase === 3 ? 3 : 2;
    player.takeDamage(damage);
    this.touchCooldown = 2.2 - this.phase * 0.3;
    cameraShakeTimer = CAMERA_SHAKE_DURATION;
    cameraShakeMagnitude = CAMERA_SHAKE_INTENSITY * 1.2;
  }

  checkPhaseTransition() {
    const ratio = this.maxHealth > 0 ? this.health / this.maxHealth : 0;
    if (ratio <= 0.33 && !this.phaseNotified[3]) {
      this.phase = 3;
      this.phaseNotified[3] = true;
      queueLevelAnnouncement("Phase 3", "Phase 3 Text Here", 2.2);
      this.hazardTimer = 2.5;
      this.summonTimer = 4.5;
      setDevStatus("Boss phase 3 – enraged", 3.5);
    } else if (ratio <= 0.66 && !this.phaseNotified[2]) {
      this.phase = Math.max(this.phase, 2);
      this.phaseNotified[2] = true;
      queueLevelAnnouncement("Phase 2", "Phase 2 Text Here", 2.2);
      this.summonTimer = 2;
      setDevStatus("Boss phase 2 – reinforcements", 3.5);
    }
  }

  takeDamage(amount, options = {}) {
    if (this.invalid || this.removed || this.state === "death") return;
    if (this.spawnIntro?.active) return;
    const damageType = options?.damageType || null;
    const damageClass = (this.damageClass || this.config?.damageClass || "normal").toLowerCase();
    let multiplier = 1;
    if (damageType) {
      if (damageClass === "tank") {
        multiplier =
          damageType === "projectile" ? 0.9 : damageType === "melee" ? 1.25 : 1.0;
      } else if (damageClass === "armored") {
        multiplier =
          damageType === "projectile" ? 0.7 : damageType === "melee" ? 0.95 : 1.35;
      } else {
        multiplier =
          damageType === "projectile" ? 1.0 : damageType === "melee" ? 1.0 : 1.1;
      }
    }
    const scaledDamage = Math.max(0, Math.round(amount * multiplier));
    const prevHealth = this.health;
    this.health = Math.max(0, this.health - scaledDamage);
    if (scaledDamage > 0 && (this.maxHealth || 0) > 0) {
      const startRatio = prevHealth / this.maxHealth;
      const endRatio = this.health / this.maxHealth;
      this.hpDamageFlash = {
        startRatio,
        endRatio,
        timer: 1.0,
        duration: 1.0,
        flashes: 3,
      };
    }
    const impactX = Number.isFinite(options.hitX)
      ? options.hitX
      : Number.isFinite(options.x)
        ? options.x
        : this.x;
    const impactY = Number.isFinite(options.hitY)
      ? options.hitY
      : Number.isFinite(options.y)
        ? options.y
        : this.y;
    if (!options.skipImpactEffect) {
      spawnImpactEffect(impactX, impactY);
    }
    if (typeof playEnemyHitSfx === "function") {
      playEnemyHitSfx();
    }
    const damageText = options?.damageText || null;
    const hpBar = this.getHpBarMetrics();
    const defaultDamageOffset =
      (hpBar?.offsetY || 0) + (hpBar?.height || 0) / 2;
    showDamage(this, amount, {
      color: damageText?.color || "#FF6B6B",
      fontSize: damageText?.fontSize || null,
      fontWeight: damageText?.fontWeight || null,
      offsetY:
        typeof damageText?.offsetY === "number"
          ? damageText.offsetY
          : defaultDamageOffset,
      fadeDelay: damageText?.fadeDelay || 0,
      priority: damageText?.priority || 0,
    });
    if (this.health <= 0) {
      this.beginDeath();
      return;
    }
    if (this.state !== "hurt") {
      this.state = "hurt";
      this.animator.play("hurt", { restart: true });
    }
    this.checkPhaseTransition();
  }

  beginDeath() {
    if (this.state === "death") return;
    this.state = "death";
    // Ensure boss death animation plays once and does not loop
    this.animator.play("death", { restart: true, loop: false });
    startBossDeathMusic();
    if (!this.victoryAnnounced) {
      queueLevelAnnouncement("Victory!", "The boss has fallen.", {
        duration: 2.0,
        skipMissionBrief: true,
        allowDuringSuppression: true,
      });
      this.victoryAnnounced = true;
    }
    const highHealth = (this.maxHealth || 0) > 400;
    if (highHealth && typeof playHighHealthEnemyDeathSfx === "function") {
      playHighHealthEnemyDeathSfx(1.0);
    } else if (typeof playEnemyDeathSfx === "function") {
      playEnemyDeathSfx(0.4);
    }
    this.dying = true;
    lastEnemyDeathPosition = { x: this.x, y: this.y };
    if (!this.deathNotified) {
      levelManager?.notifyEnemyDefeated();
      spawnPowerUpDrops(4 + Math.min(3, this.level));
      spawnMagicSplashEffect(this.x, this.y, this.radius * 2.8);
      spawnImpactDustEffect(this.x, this.y, this.radius * 1.2);
      this.deathNotified = true;
    }
    this.deathExplosionTimer = 5;
    this.deathPostDelay = 1;
    this.deathExplosionAccumulator = 0;
    this.deathVisualTotal = this.deathExplosionTimer + this.deathPostDelay;
    this.deathGraceRainTimer = 0.08;
    this.deathGraceRainInterval = 0.18;
    if (!this.deathStageNotified) {
      levelManager?.markBossDefeated?.();
      this.deathStageNotified = true;
    }
    eliminateActiveEnemiesForBossVictory();
    // compute fallback death timer from clip (prefer explicit frameMap length)
    try {
      const clip = this.animator.currentClip || {};
      const framesFromMap =
        Array.isArray(clip.frameMap) && clip.frameMap.length ? clip.frameMap.length : null;
      const frames = framesFromMap || clip.frameCount || 0 || 10;
      const rate = clip && clip.frameRate ? clip.frameRate : 8;
      const expected = Math.max(0.05, frames / Math.max(0.0001, rate));
      this.deathTimer = expected + 0.3;
      console.debug &&
        console.debug("Boss death initiated", { frames, rate, expected, deathTimer: this.deathTimer });
    } catch (e) {}
  }

  spawnDeathExplosionBurst() {
    const hitbox = this.hitbox || this.config?.hitbox || null;
    const hbOffsetX = hitbox && Number.isFinite(hitbox.offsetX) ? hitbox.offsetX : 0;
    const hbOffsetY = hitbox && Number.isFinite(hitbox.offsetY) ? hitbox.offsetY : 0;
    const hbHalfW = hitbox && Number.isFinite(hitbox.width) ? hitbox.width * 0.5 : this.radius;
    const hbHalfH = hitbox && Number.isFinite(hitbox.height) ? hitbox.height * 0.5 : this.radius;
    // Hitbox is tiny versus the rendered boss sprite, so apply an explicit
    // screen-space lift to keep explosions over the visible corpse.
    const corpseVisualLift = -72;
    const burstCenterX = this.x + hbOffsetX - 70;
    const burstCenterY = this.y + hbOffsetY + hbHalfH * 0.0 + corpseVisualLift;
    const burstCount = 2 + Math.floor(Math.random() * 3);
    const burstRadius = Math.max(hbHalfW, hbHalfH) * 1.05;
    for (let i = 0; i < burstCount; i += 1) {
      const burstX = burstCenterX + (Math.random() * 2 - 1) * hbHalfW * 1.2;
      const burstY = burstCenterY + (Math.random() * 2 - 1) * hbHalfH * 0.45;
      spawnEnemyDeathExplosion(burstX, burstY, {
        radius: burstRadius,
        scaleMultiplier: 1.2,
      });
      if (Math.random() < 0.45) {
        spawnImpactDustEffect(burstX, burstY, this.radius * 0.4);
      }
      if (Math.random() < 0.25) {
        spawnRayboltEffect(burstX, burstY, this.radius * 0.55);
      }
    }
    const sfxVolume = 0.55 + Math.random() * 0.35;
    playPooledSfx(bossDeathExplosionSfxPool, BOSS_DEATH_EXPLOSION_SFX_SRCS, BOSS_DEATH_EXPLOSION_SFX_POOL_SIZE, { volume: sfxVolume, matchSrc: true });
  }

  updateDeathVisuals(dt) {
    if (this.deathExplosionTimer > 0) {
      this.deathExplosionTimer = Math.max(0, this.deathExplosionTimer - dt);
      this.deathExplosionAccumulator += dt;
      this.deathGraceRainTimer = Math.max(0, (this.deathGraceRainTimer || 0) - dt);
      while (this.deathGraceRainTimer <= 0 && this.deathExplosionTimer > 0) {
        this.deathGraceRainTimer += this.deathGraceRainInterval;
        spawnVictoryGraceBurst({
          reason: "boss",
          amount: 18,
          life: 22,
          centerX: this.x,
          centerY: this.y,
        });
      }
      const progress = 1 - Math.max(0, this.deathExplosionTimer) / 5;
      const interval = Math.max(0.07, 0.22 - progress * 0.12);
      while (this.deathExplosionAccumulator >= interval) {
        this.deathExplosionAccumulator -= interval;
        this.spawnDeathExplosionBurst();
      }
      return;
    }
    if (this.deathPostDelay > 0) {
      this.deathPostDelay = Math.max(0, this.deathPostDelay - dt);
    }
  }

  getDeathFadeAlpha() {
    if (this.state !== "death") return 1;
    const total = Number.isFinite(this.deathVisualTotal) ? this.deathVisualTotal : 0;
    if (total <= 0) return 1;
    const remaining =
      Math.max(0, Number.isFinite(this.deathExplosionTimer) ? this.deathExplosionTimer : 0) +
      Math.max(0, Number.isFinite(this.deathPostDelay) ? this.deathPostDelay : 0);
    const linear = Math.max(0, Math.min(1, remaining / total));
    const fastFadeExponent = 2.2;
    return Math.pow(linear, fastFadeExponent);
  }

  update(dt) {
    if (!this.isActive()) return;
    if (this.hpDamageFlash?.timer > 0) {
      this.hpDamageFlash.timer = Math.max(0, this.hpDamageFlash.timer - dt);
    }

    if (this.spawnIntro?.active) {
      this.spawnIntro.timer = Math.max(0, this.spawnIntro.timer + dt);
      const precursorDuration = Math.max(0, this.spawnIntro.precursorDuration || 0);
      const finalTimer = Math.max(0, this.spawnIntro.timer - precursorDuration);
      const frameDuration = Math.max(0.01, this.spawnIntro.frameDuration || 0.06);
      const introFrame = Math.floor(finalTimer / frameDuration) + 1;
      const opaqueBy = Math.max(1, Math.round(this.spawnIntro.opaqueByFrame || 4));
      this.spawnIntro.bossAlpha = this.spawnIntro.timer >= precursorDuration
        ? Math.max(0, Math.min(1, introFrame / opaqueBy))
        : 0;
      const events = Array.isArray(this.spawnIntro.events) ? this.spawnIntro.events : [];
      events.forEach((event) => {
        if (!event || event.sfxPlayed || this.spawnIntro.timer < (event.startTime || 0)) return;
        event.sfxPlayed = true;
        const sfxVolume = 0.48 + Math.random() * 0.28;
        playPooledSfx(
          bossDeathExplosionSfxPool,
          BOSS_DEATH_EXPLOSION_SFX_SRCS,
          BOSS_DEATH_EXPLOSION_SFX_POOL_SIZE,
          { volume: sfxVolume, matchSrc: true },
        );
      });
      const frameCount = Math.max(1, Math.round(this.spawnIntro.frameCount || 5));
      if (this.spawnIntro.timer >= precursorDuration + frameCount * frameDuration) {
        this.spawnIntro.active = false;
        this.spawnIntro.bossAlpha = 1;
      }
      this.animator.update(dt);
      return;
    }

    if (this.state === "death") {
      this.animator.update(dt);
      this.updateDeathVisuals(dt);
      if (typeof this.deathTimer === 'number') {
        this.deathTimer -= dt;
        if (this.deathTimer <= 0 && !this.animator.isFinished()) {
          console.debug && console.debug('Boss death timeout forcing finish', { x: this.x, y: this.y });
          this.animator.finished = true;
        }
      }
      const animationFinished = this.animator.isFinished();
      const explosionsFinished = this.deathExplosionTimer <= 0;
      const holdFinished = explosionsFinished && this.deathPostDelay <= 0;
      if (animationFinished && explosionsFinished && holdFinished) {
        this.dead = true;
        this.removed = true;
        this.defeated = true;
        levelManager?.markBossDefeated();
      }
      return;
    }

    if (this.state === "hurt" && this.animator.isFinished()) {
      this.state = "walk";
      this.animator.play("walk");
    }
    if (this.state === "attack" && this.animator.isFinished()) {
      markCounterHitWindow(this);
      this.state = "walk";
      this.animator.play("walk");
    }

    this.projectileTimer -= dt;
    this.summonTimer -= dt;
    this.hazardTimer -= dt;
    this.touchCooldown = Math.max(0, this.touchCooldown - dt);
    this.shieldHitCooldown = Math.max(0, (this.shieldHitCooldown || 0) - dt);
    this.tauntCooldown = Math.max(0, (this.tauntCooldown || 0) - dt);

    if (player && player.state !== "death") {
      this.moveTowardPlayer(dt);
      this.applyContactDamage();
    } else {
      this.state = "idle";
      this.animator.play("idle");
    }

    if (this.projectileTimer <= 0) {
      this.performProjectileAttack();
      this.projectileTimer = this.getProjectileCooldown();
    }

    if (this.phase >= 2 && this.summonTimer <= 0) {
      this.summonMinions();
      this.summonTimer = this.getSummonCooldown();
    }

    if (this.phase >= 3 && this.hazardTimer <= 0) {
      this.spawnHazard();
      this.hazardTimer = this.getHazardCooldown();
    }

    this.animator.update(dt);
  }

  draw(context) {
    if (!this.isActive()) return;
    const flip = this.facing === "left";
    const fadeAlpha = this.getDeathFadeAlpha();
    const spawnIntro = this.spawnIntro || null;
    const spawnAlpha = spawnIntro?.active
      ? Math.max(0, Math.min(1, spawnIntro.bossAlpha ?? 0))
      : 1;
    const drawAlpha = Math.max(0, Math.min(1, fadeAlpha * spawnAlpha));
    this.animator.draw(context, this.x, this.y, { flipX: flip, alpha: drawAlpha });

    if (spawnIntro?.active) {
      const introTimer = Math.max(0, Number(spawnIntro.timer) || 0);
      const hitbox = this.hitbox || this.config?.hitbox || null;
      const hbOffsetY = hitbox && Number.isFinite(hitbox.offsetY) ? hitbox.offsetY : 0;
      const hbHalfH = hitbox && Number.isFinite(hitbox.height) ? hitbox.height * 0.5 : this.radius;
      const activeClip = this.animator?.currentClip || null;
      const clipRenderScale =
        activeClip && Number.isFinite(activeClip.renderScale) && activeClip.renderScale > 0
          ? activeClip.renderScale
          : 1;
      const animatorScale =
        this.animator && Number.isFinite(this.animator.scale) && this.animator.scale > 0
          ? this.animator.scale
          : 1;
      const spriteHalfH =
        activeClip && Number.isFinite(activeClip.frameHeight) && activeClip.frameHeight > 0
          ? (activeClip.frameHeight * clipRenderScale * animatorScale) / 2
          : null;
      const groundAnchorY = Number.isFinite(spriteHalfH) && spriteHalfH > 0
        ? this.y + spriteHalfH * 0.98
        : this.y + hbOffsetY + hbHalfH * 0.95;
      const events = Array.isArray(spawnIntro.events) ? spawnIntro.events : [];
      events.forEach((event) => {
        if (!event) return;
        const eventStart = Math.max(0, Number(event.startTime) || 0);
        const eventDuration = Math.max(0.05, Number(event.duration) || 0.2);
        const localTimer = introTimer - eventStart;
        if (localTimer < 0 || localTimer > eventDuration) return;
        const frames = assets?.effects?.[event.key] || assets?.effects?.prayerBombExplosion;
        if (!Array.isArray(frames) || !frames.length) return;
        const eventFrameDuration = Math.max(0.01, Number(event.frameDuration) || 0.04);
        const frameIndex = Math.max(
          0,
          Math.min(
            frames.length - 1,
            Math.floor(localTimer / eventFrameDuration),
          ),
        );
        const frame = frames[frameIndex];
        if (!frame) return;
        const lifeRatio = Math.max(0, Math.min(1, localTimer / eventDuration));
        const size = Math.max(64, Number(event.size) || 240);
        context.save();
        context.globalAlpha = 1 - lifeRatio * 0.15;
        context.drawImage(
          frame,
          this.x + (Number(event.offsetX) || 0) - size / 2,
          groundAnchorY + (Number(event.offsetY) || 0) - size,
          size,
          size,
        );
        context.restore();
      });

      const frames = assets?.effects?.prayerBombExplosion;
      const precursorDuration = Math.max(0, spawnIntro.precursorDuration || 0);
      const finalTimer = Math.max(0, introTimer - precursorDuration);
      if (Array.isArray(frames) && frames.length && introTimer >= precursorDuration) {
        const frameDuration = Math.max(0.01, spawnIntro.frameDuration || 0.06);
        const frameCount = Math.max(1, Math.round(spawnIntro.frameCount || 5));
        const frameIndex = Math.max(
          0,
          Math.min(
            frameCount - 1,
            Math.floor(finalTimer / frameDuration),
          ),
        );
        const frame = frames[Math.min(frameIndex, frames.length - 1)];
        if (frame) {
          const size = Math.max(64, Number(spawnIntro.explosionSize) || 420);
          const mainExplosionGroundRatio = Math.max(
            0.4,
            Math.min(1.2, Number(spawnIntro.mainExplosionGroundRatio) || 1),
          );
          const mainExplosionOffsetY = Number(spawnIntro.mainExplosionOffsetY) || 0;
          context.save();
          context.globalAlpha = 1;
          context.drawImage(
            frame,
            this.x - size / 2,
            groundAnchorY + mainExplosionOffsetY - size * mainExplosionGroundRatio,
            size,
            size,
          );
          context.restore();
        }
      }
    }

    this.drawHealthBar(context, drawAlpha);
  }

  drawHealthBar(context, alpha = 1) {
    if (alpha <= 0) return;
    const ratio = this.maxHealth > 0 ? Math.max(0, this.health / this.maxHealth) : 0;
    const metrics = this.getHpBarMetrics();
    const width = metrics.width;
    const height = metrics.height;
    const barX = this.x - width / 2;
    const barY = this.y - this.radius + metrics.offsetY;
    const labelName = this.config?.displayName || this.type || "Boss";
    const hpValue = Math.max(0, Math.round(this.health));
    const hpMax = Math.max(1, Math.round(this.maxHealth || 1));
    const label = `${labelName} (${hpValue}/${hpMax})`;
    context.save();
    context.globalAlpha *= Math.max(0, Math.min(1, alpha));
    context.fillStyle = "rgba(10,15,31,0.6)";
    context.lineWidth = 2.5;
    context.strokeStyle = "#9BD9FF";
    roundRect(context, barX, barY, width, height, 6, true, true);
    const fillWidth = Math.max(0, Math.floor((width - 4) * ratio));
    if (fillWidth > 0) {
      context.fillStyle = "#B23A3A";
      context.fillRect(barX + 2, barY + 2, fillWidth, height - 4);
    }
    const hpFlash = this.hpDamageFlash;
    if (hpFlash?.timer > 0 && hpFlash.duration > 0) {
      const startRatio = Math.max(0, Math.min(1, hpFlash.startRatio || 0));
      const endRatio = Math.max(0, Math.min(1, hpFlash.endRatio || 0));
      const delta = Math.max(0, startRatio - endRatio);
      if (delta > 0) {
        const progress = 1 - hpFlash.timer / hpFlash.duration;
        const pulse = Math.abs(Math.sin(progress * Math.PI * (hpFlash.flashes || 3)));
        const alpha = 0.2 + 0.8 * pulse;
        const segmentX = barX + 2 + Math.floor((width - 4) * endRatio);
        const segmentW = Math.max(1, Math.floor((width - 4) * delta));
        context.fillStyle = `rgba(255, 246, 170, ${alpha.toFixed(3)})`;
        context.fillRect(segmentX, barY + 2, segmentW, height - 4);
      }
    }
    context.font = `12px ${UI_FONT_FAMILY}`;
    context.fillStyle = "#EAF6FF";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, barX + width / 2, barY + height / 2 + 1);
    context.restore();
  }
}

function spawnProjectile(type, x, y, dx, dy, overrides = {}) {
  if (!assets) return null;
  const baseConfig = PROJECTILE_CONFIG[type];
  if (!baseConfig) return null;

  const clip = assets.projectiles[type];
  if (!clip) return null;
  const config = { ...baseConfig, ...overrides };
  const bossStageActive =
    levelManager?.getStatus &&
    ["bossIntro", "bossActive"].includes(levelManager.getStatus().stage);
  const bossRangeMultiplier =
    bossStageActive && config.friendly && config.source?.isPlayer ? 1.5 : 1;
  const priority = overrides.priority ?? baseConfig.priority ?? 0;
  config.priority = priority;
  const isDivineShot = overrides.isDivineShot ?? baseConfig.isDivineShot ?? false;
  config.isDivineShot = isDivineShot;
  if (overrides.damage === undefined && baseConfig && baseConfig.damage !== undefined) {
    config.damage = baseConfig.damage;
  }
  if (overrides.scale === undefined && baseConfig && baseConfig.scale !== undefined) {
    config.scale = baseConfig.scale;
  }
  config.friendly = overrides.friendly ?? true;
  config.source = overrides.source || null;
  if (
    config.friendly &&
    config.source &&
    (config.source.isPlayer || config.source.isCozyNpc)
  ) {
    config.source.projectileGlowTimer = Math.max(config.source.projectileGlowTimer || 0, 0.22);
  }
  if (bossRangeMultiplier > 1) {
    if (Number.isFinite(config.life)) {
      config.life *= bossRangeMultiplier;
    } else if (Number.isFinite(config.speed) && config.speed > 0) {
      const direction = normalizeVector(dx, dy);
      const travel = distanceToEdge(x, y, direction.x, direction.y);
      if (travel > 0) {
        config.life = (travel / config.speed) * bossRangeMultiplier;
      }
    }
  }
  const frames = projectileFrames[type] || clip.frames;
  // If caller explicitly provided frames override, use those. Otherwise use
  // pre-extracted frames from projectileFrames or clip.frames.
  if (Array.isArray(overrides.frames) && overrides.frames.length) {
    config.frames = overrides.frames;
    config.frameDuration = config.frameDuration ?? PROJECTILE_FRAME_DURATIONS[type] ?? 0.05;
    config.flipHorizontal = overrides.flipHorizontal ?? dx < 0;
    if (config.loopFrames === undefined) config.loopFrames = Boolean(overrides.loopFrames) || false;
  } else if (frames && frames.length) {
    config.frames = frames;
    config.frameDuration = config.frameDuration ?? PROJECTILE_FRAME_DURATIONS[type] ?? 0.05;
    config.flipHorizontal = overrides.flipHorizontal ?? dx < 0;
    if (config.loopFrames === undefined) config.loopFrames = true;
  } else {
    config.flipHorizontal = overrides.flipHorizontal ?? dx < 0;
  }
  const isBossSource =
    typeof BossEncounter !== "undefined" && config.source instanceof BossEncounter;
  if (isBossSource && config.friendly === false) {
    const direction = normalizeVector(dx, dy);
    const travel = distanceToEdge(x, y, direction.x, direction.y);
    const effectiveSpeed = Number.isFinite(config.speed) && config.speed > 0 ? config.speed : 1;
    const desiredLife = travel > 0 ? travel / effectiveSpeed : 0;
    const currentLife = Number.isFinite(config.life) ? config.life : 0;
    config.life = Math.max(currentLife, desiredLife, 1);
  }
  if (
    isBossSource &&
    (!Array.isArray(overrides.frames) || overrides.frames.length === 0)
  ) {
    const bossFrames = projectileFrames.fire;
    if (bossFrames && bossFrames.length) {
      config.frames = bossFrames;
      config.frameDuration =
        config.frameDuration ?? PROJECTILE_FRAME_DURATIONS.fire ?? 0.05;
      config.flipHorizontal = overrides.flipHorizontal ?? dx < 0;
      config.loopFrames = true;
    }
  }
  if (isBossSource && config.friendly === false && !config.onExpire) {
    config.onExpire = (proj) => {
      const radius = proj?.radius || proj?.config?.radius || 40;
      spawnBossProjectilePuffEffect(proj?.x ?? x, proj?.y ?? y, { radius: radius * 2 });
    };
  }
  const projectile = new Projectile(type, config, clip, x, y, dx, dy);
  projectiles.push(projectile);
  return projectile;
}

function projectilesIntersect(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const radiusA = a.radius || 16;
  const radiusB = b.radius || 16;
  return Math.hypot(dx, dy) <= radiusA + radiusB;
}

function isBossProjectile(projectile) {
  return Boolean(projectile && projectile.source instanceof BossEncounter);
}

function randomChoice(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getEnemySpawnPoints() {
  const offset = ENEMY_SPAWN_MARGIN;
  const width = canvas.width;
  const height = canvas.height;
  const centerX = typeof player?.x === "number" ? player.x : width / 2;
  const bufferX = Math.max(width * 1.8, 1200);
  const bufferY = Math.max(height * 1.4, 900);
  return [
    {
      x: centerX - bufferX - offset,
      y: HUD_HEIGHT - bufferY - offset,
      anchors: ["left", "top"],
      label: "1",
    },
    {
      x: centerX + bufferX + offset,
      y: HUD_HEIGHT - bufferY - offset,
      anchors: ["right", "top"],
      label: "2",
    },
    {
      x: centerX - bufferX - offset,
      y: height + bufferY + offset,
      anchors: ["left", "bottom"],
      label: "3",
    },
    {
      x: centerX + bufferX + offset,
      y: height + bufferY + offset,
      anchors: ["right", "bottom"],
      label: "4",
    },
  ];
}

function randomSpawnPosition() {
  const width = canvas.width;
  const height = canvas.height;
  const horizontalMargin = Math.max(120, Math.floor(width * 0.12));
  const verticalMargin = Math.max(100, Math.floor(height * 0.12));
  const bottomCutoff = HUD_HEIGHT + (height - HUD_HEIGHT) * (1 / 3);
  const sideMaxY = height - Math.max(32, Math.floor(height * 0.1));
  const pickLane = (min, max, laneCount = 4, jitter = 0) => {
    if (max <= min) return min;
    const count = Math.max(1, Math.round(laneCount));
    if (count === 1) return (min + max) * 0.5;
    const step = (max - min) / (count - 1);
    const laneIndex = Math.floor(Math.random() * count);
    const center = min + step * laneIndex;
    return Math.max(min, Math.min(max, center + randomInRange(-jitter, jitter)));
  };
  const edge = Math.floor(Math.random() * 3);
  if (edge === 0) {
    // left wall
    return {
      x: -horizontalMargin,
      y: pickLane(bottomCutoff, sideMaxY, 4, 42),
      __spawnEdge: "left",
    };
  }
  if (edge === 1) {
    // right wall
    return {
      x: width + horizontalMargin,
      y: pickLane(bottomCutoff, sideMaxY, 4, 42),
      __spawnEdge: "right",
    };
  }
  return {
    x: pickLane(horizontalMargin, width - horizontalMargin, 5, 56),
    y: height + verticalMargin,
    __spawnEdge: "bottom",
  };
}

function getGenderedVariantBases(folder, gender) {
  const normalized = normalizeNpcGender(gender);
  const byGender = folder === "hair" ? npcVariants.hairByGender : npcVariants.clothingByGender;
  if (!byGender) return null;
  const base = byGender[normalized] || [];
  const unisex = byGender.unisex || [];
  const combined = [...base, ...unisex].filter(Boolean);
  return combined.map((entry) => entry.replace("_walk.png", "").replace(".png", ""));
}

function createRandomNpcLayers(gender = null) {
  if (!assets?.npcs) return null;
  const { walk, hurt, eyes, shadow } = assets.npcs;
  if (!walk?.base || !hurt?.base) return null;

  const hairKeys = Object.keys(walk.hair || {});
  const clothesKeys = Object.keys(walk.clothes || {});
  const accessoryKeys = Object.keys(walk.accessories || {});

  const genderHairBases = getGenderedVariantBases("hair", gender);
  const genderClothingBases = getGenderedVariantBases("clothes", gender);
  const matchingHairKeys = genderHairBases
    ? hairKeys.filter((key) => genderHairBases.some((base) => key === base || key.startsWith(`${base}__`)))
    : hairKeys;
  const matchingClothesKeys = genderClothingBases
    ? clothesKeys.filter((key) => genderClothingBases.includes(key))
    : clothesKeys;

  const selectedHair = randomChoice(matchingHairKeys.length ? matchingHairKeys : hairKeys);
  const selectedClothing = randomChoice(matchingClothesKeys.length ? matchingClothesKeys : clothesKeys);
  let selectedAccessory = null;
  if (accessoryKeys.length && Math.random() < 0.35) {
    selectedAccessory = randomChoice(accessoryKeys);
  }

  const collectLayer = (collection, key) => {
    if (!collection) return null;
    return key ? collection[key] || null : null;
  };

  const walkLayers = [
    walk.base,
    eyes,
    walk.shoes,
    collectLayer(walk.clothes, selectedClothing),
    collectLayer(walk.hair, selectedHair),
    selectedAccessory ? collectLayer(walk.accessories, selectedAccessory) : null,
  ].filter(Boolean);

  const hurtLayers = [
    hurt.base,
    eyes,
    hurt.shoes || walk.shoes,
    collectLayer(hurt.clothes, selectedClothing) || collectLayer(walk.clothes, selectedClothing),
    collectLayer(hurt.hair, selectedHair) || collectLayer(walk.hair, selectedHair),
    selectedAccessory
      ? collectLayer(hurt.accessories, selectedAccessory) ||
        collectLayer(walk.accessories, selectedAccessory)
      : null,
  ].filter(Boolean);

  return {
    shadow,
    animations: {
      walk: {
        layers: walkLayers,
        frameDuration: NPC_WALK_FRAME_DURATION,
        framesPerDirection: NPC_COZY_WALK_FRAME_COUNT,
      },
      hurt: {
        layers: hurtLayers.length ? hurtLayers : walkLayers,
        frameDuration: NPC_HURT_FRAME_DURATION,
        framesPerDirection: 1,
      },
    },
  };
}

function normalizeNpcGender(gender) {
  if (gender === "male" || gender === "female") return gender;
  return Math.random() < 0.5 ? "male" : "female";
}

function ensureNpcNamesList() {
  if (!window.npcNamesByGender) {
    const maleNames = [
      "Aaron", "Adam", "Alex", "Ben", "Blake", "Brock", "Brad", "Carl", "Chris", "Cody", "Dave",
      "Derek", "Drew", "Ethan", "Frank", "Felix", "Fred", "Gabe", "Gary", "Gavin", "Greg", "Hank",
      "Henry", "Isaac", "Ivan", "Jesse", "Jonah", "Kevin", "Lance", "Logan", "Mason", "Miles", "Micah",
      "Nolan", "Oscar", "Owen", "Peter", "Perry", "Quinn", "Robin", "Roger", "Simon", "Scott", "Steve",
      "Terry", "Tony", "Trent", "Todd", "Ulis", "Vince", "Wade", "Wayne", "Zack", "Zane", "Yuri",
    ];
    const femaleNames = [
      "Abby", "Clara", "Diana", "Emma", "Emily", "Erin", "Fiona", "Helen", "Holly", "Irene", "Janet",
      "Jill", "Karen", "Katie", "Kelly", "Laura", "Linda", "Megan", "Naomi", "Nancy", "Olive", "Paige",
      "Rose", "Sarah", "Vicky", "Vera", "Wendy", "Xena", "Yael", "Zelda", "Erick", "Grace", "Avery",
      "Ashley", "Daisy", "Elise", "Ellen", "Jenna", "Julie", "Julia", "Lucy", "Maddie", "Maria",
    ];
    window.npcNamesByGender = {
      male: maleNames,
      female: femaleNames,
    };
    window.npcNamesList = [...maleNames, ...femaleNames];
  }
}

function pickNameForGender(gender) {
  ensureNpcNamesList();
  const normalized = normalizeNpcGender(gender);
  const list = window.npcNamesByGender?.[normalized] || window.npcNamesList || [];
  const key = `${normalized}NameIndex`;
  if (!Number.isFinite(window[key])) window[key] = 0;
  const name = list[window[key] % Math.max(1, list.length)] || "Friend";
  window[key] += 1;
  return name;
}

function resetYearNpcPool() {
  ensureNpcNamesList();
  window.npcYearNamePoolByGender = {
    male: shuffleArray(window.npcNamesByGender?.male || []),
    female: shuffleArray(window.npcNamesByGender?.female || []),
  };
  window.npcYearNamesUsedByGender = {
    male: new Set(),
    female: new Set(),
  };
}

function pickYearNpcName(gender) {
  ensureNpcNamesList();
  const normalized = normalizeNpcGender(gender);
  if (!window.npcYearNamePoolByGender || !window.npcYearNamePoolByGender[normalized]?.length) {
    resetYearNpcPool();
  }
  if (!window.npcYearNamesUsedByGender || !(window.npcYearNamesUsedByGender[normalized] instanceof Set)) {
    resetYearNpcPool();
  }
  const pool = window.npcYearNamePoolByGender[normalized] || [];
  const used = window.npcYearNamesUsedByGender[normalized];
  while (pool.length) {
    const name = pool.shift();
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }
  const list = window.npcNamesByGender?.[normalized] || [];
  const remaining = list.filter((name) => !used.has(name));
  if (remaining.length) {
    window.npcYearNamePoolByGender[normalized] = shuffleArray(remaining);
    return pickYearNpcName(normalized);
  }
  resetYearNpcPool();
  const fallback = window.npcYearNamePoolByGender[normalized]?.shift();
  if (fallback) used.add(fallback);
  return fallback;
}

function getOffscreenNpcInviteName(excludedNames = []) {
  ensureNpcNamesList();
  const exclude = new Set(
    (Array.isArray(excludedNames) ? excludedNames : [])
      .map((name) => String(name || "").trim())
      .filter(Boolean),
  );
  const fullList = Array.isArray(window.npcNamesList) ? window.npcNamesList : [];
  const candidates = fullList.filter((name) => !exclude.has(name));
  if (!candidates.length) return null;
  return randomChoice(candidates) || candidates[0] || null;
}

function createCozyNpc() {
  const gender = normalizeNpcGender();
  const appearance = createRandomNpcLayers(gender);
  if (!appearance) return null;
  const name = pickYearNpcName(gender);
  const npc = new CozyNpc({ appearance });
  npc.name = name || "Friend";
  npc.gender = gender;
  return npc;
}

function spawnCozyNpc() {
  const npc = createCozyNpc();
  if (!npc) return null;
  npcs.push(npc);
  return npc;
}

function resetCozyNpcs(count = 5) {
  npcs.splice(0, npcs.length);
  const targetCount = count ?? 5;
  for (let i = 0; i < targetCount; i += 1) {
    if (!spawnCozyNpc()) break;
  }
  if (!formationState.current) {
    formationState.current = "circle";
  }
  applyFormationAnchors();
}

function applyFormationAnchors() {
  if (!npcs.length) return;
  formationState.homePressure = 0;
  formationState.combatSpreadScaleCurrent = formationState.combatSpreadScale || 1.18;
  const anchors = computeFormationAnchors(npcs.length);
  if (!anchors.length) return;
  const jitter = formationState?.jitterRadius ?? 0;
  resetFormationSwaps();
  npcs.forEach((npc, idx) => {
    const anchor = anchors[idx % anchors.length];
    if (!anchor || !npc) return;
    npc.formationAnchor = { ...anchor };
    npc.x = anchor.x + randomInRange(-jitter * 0.12, jitter * 0.12);
    npc.y = anchor.y + randomInRange(-jitter * 0.1, jitter * 0.1);
    npc.baseX = npc.x;
    npc.baseY = npc.y;
    npc.zonePatrolSide = idx % 2 === 0 ? -1 : 1;
    npc.patrolClock = (idx / Math.max(1, npcs.length)) * Math.PI * 2;
    const briefingPoint = getNpcBriefingPoint(npc);
    npc.x = briefingPoint.x;
    npc.y = briefingPoint.y;
    npc.baseX = npc.x;
    npc.baseY = npc.y;
    npc.target = briefingPoint;
    npc.state = "wander";
    npc.formationWarmupTimer = 0;
    npc.idleTimer = 0;
    npc.zonePatrolCommitTimer = randomInRange(0.45, 0.75);
    npc.zoneMoveMode = "briefing";
    npc.hasSwappedThisBattle = false;
  });
}

function resetCongregationSize() {
  congregationSize = Number.isFinite(townStartCongregation)
    ? townStartCongregation
    : INITIAL_CONGREGATION_SIZE;
}

function adjustCongregationSize(delta) {
  if (!Number.isFinite(delta) || delta === 0) return congregationSize;
  congregationSize = Math.max(0, Math.round(congregationSize + delta));
  return congregationSize;
}

function handleNpcLostFromCongregation() {
  adjustCongregationSize(-1);
}

function getCongregationSize() {
  return congregationSize;
}

function prepareNpcProcession() {
  if (!npcs.length) return false;
  const bounds = getPlayfieldBounds();
  const startXBase = -NPC_PROCESSION_ENTRY_MARGIN;
  npcs.forEach((npc, index) => {
    if (typeof npc.beginProcession !== "function") return;
    const laneY = randomInRange(bounds.minY, bounds.maxY);
    const homeBounds = getNpcHomeBounds();
    const target = {
      x: randomInRange(homeBounds.minX, homeBounds.maxX),
      y: randomInRange(homeBounds.minY, homeBounds.maxY),
    };
    const offset = index * 28;
    npc.beginProcession({
      startX: startXBase - offset,
      startY: laneY,
      target,
      speed: randomInRange(60, 90) * NPC_PROCESSION_SPEED_MULTIPLIER,
    });
  });
  npcProcessionActive = true;
  return true;
}

function areNpcProcessionsComplete() {
  if (!npcProcessionActive) return true;
  const allDone = npcs.every((npc) => (typeof npc.isInProcession === "function" ? !npc.isInProcession() : true));
  if (allDone) {
    npcProcessionActive = false;
  }
  return allDone;
}

function beginVisitorSession(options = {}) {
  if (visitorSession.active) return false;
  const { duration = VISITOR_SESSION_DURATION, autoTriggered = false, onComplete = null, level = 0 } = options || {};
  // Always use initial congregation size for consistent minigame difficulty
  const congregationCount = INITIAL_CONGREGATION_SIZE;
  const targetVisitors = VISITOR_GUEST_COUNT;
  const areaSpec = getCongregationSpawnAreaSpecs(Math.max(congregationCount, targetVisitors));
  const bounds = areaSpec.bounds;
  visitorSession.active = true;
  visitorSession.duration = duration;
  visitorSession.timer = duration;
  visitorSession.visitors = [];
  visitorSession.blockers = [];
  visitorSession.targetVisitors = targetVisitors;
  visitorSession.savedVisitors = 0;
  visitorSession.quietedBlockers = 0;
  visitorSession.onComplete = typeof onComplete === "function" ? onComplete : null;
  visitorSession.autoTriggered = Boolean(autoTriggered);
  visitorSession.sourceLevel = level || 0;
  visitorSession.bounds = bounds;
  visitorSession.ended = false;
  visitorSession.activeChatty = new Set();
  visitorSession.lockingBlockers = new Set();
  visitorSession.movementLock = false;
  visitorSession.summaryActive = false;
  visitorSession.introShown = false;
  visitorSession.summaryReason = null;
  visitorSession.awaitingSummaryConfirm = false;
  visitorSession.summaryReason = null;
  visitorSession.awaitingSummaryConfirm = false;
  visitorSession.newMemberPortraits = [];
  visitorSession.newMemberNames = [];
  visitorSession.introActive = true;
  visitorSession.usedNpcIds = new Set();
  visitorSession.usedChattyLines = new Set();
  visitorSession.recapShown = false;
  enemies.splice(0, enemies.length);
  projectiles.splice(0, projectiles.length);
  bossHazards.splice(0, bossHazards.length);
  clearAllPowerUps();
  clearGracePickups();
  activeBoss = null;
  if (player) {
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    player.x = centerX;
    player.y = centerY;
    player.lockedPosition = null;
    clampEntityToBounds(player);
  }
  spawnVisitorGuests(bounds);
  spawnVisitorBlockers(bounds);
  if (player) {
    player.arrowCooldown = 0;
  }
  stopBattleMusicFast();
  startVisitorMusic();
  setDevStatus("Welcoming new visitors...", 3.2);
  return true;
}

function endVisitorSession({ reason = "completed" } = {}) {
  if (!visitorSession.active) return;
  try {
    visitorSession.visitors.forEach((guest) => {
      if (!guest) return;
      guest.removed = true;
      if (guest.speechBubble) {
        guest.speechBubble.life = 0;
        guest.speechBubble = null;
      }
    });
    visitorSession.blockers.forEach((blocker) => {
      if (!blocker) return;
      blocker.removed = true;
      if (blocker.speechBubble) {
        blocker.speechBubble.life = 0;
        blocker.speechBubble = null;
      }
    });
  } catch (err) {
    console.warn && console.warn("Failed to clear visitor speech bubbles", err);
  }
  visitorSession.active = false;
  visitorSession.visitors.length = 0;
  visitorSession.blockers.length = 0;
  visitorSession.timer = 0;
  visitorSession.ended = true;
  visitorSession.bounds = null;
  visitorSession.targetVisitors = VISITOR_GUEST_COUNT;
  visitorSession.activeChatty = new Set();
  visitorSession.lockingBlockers = new Set();
  visitorSession.movementLock = false;
  visitorSession.summaryActive = false;
  visitorSession.summaryReason = null;
  visitorSession.awaitingSummaryConfirm = false;
  visitorSession.introActive = false;
  visitorSession.newMemberPortraits = [];
  visitorSession.usedChattyLines = new Set();
  visitorSession.recapShown = false;
  clearAllPowerUps();
  clearGracePickups();
  stopRecapMusic();
  stopVisitorMusic();
  if (typeof window !== "undefined" && typeof window.resumeBattleMusicIfNeeded === "function") {
    window.resumeBattleMusicIfNeeded();
  }
  if (reason !== "reset" && reason !== "devCancel") {
    const message =
      reason === "timer"
        ? "Visitation hour ended"
        : reason === "allSaved"
          ? "Well done! Welcome new members!"
          : "Visitors welcomed";
    setDevStatus(message, 2.8);
  }
  if (pendingExteriorShotAfterVisitor) {
    queueExteriorShotAnnouncement({ force: true });
  }
  const callback = visitorSession.onComplete;
  visitorSession.onComplete = null;
  if (typeof callback === "function") {
    try {
      callback(reason);
    } catch (err) {
      console.warn && console.warn("Visitor session completion callback failed", err);
    }
  }
}

function completeVisitorSession(reason = "completed") {
  if (!visitorSession.active) return;
  endVisitorSession({ reason });
}

function spawnVisitorGuests(bounds) {
  const total = visitorSession.targetVisitors || VISITOR_GUEST_COUNT;
  for (let i = 0; i < total; i += 1) {
    const guest = createVisitorGuest(bounds, i, total);
    if (guest) visitorSession.visitors.push(guest);
  }
}

function spawnVisitorBlockers(bounds) {
  // Always use initial congregation size for consistent minigame difficulty
  const baseCount = INITIAL_CONGREGATION_SIZE;
  for (let i = 0; i < baseCount; i += 1) {
    const blocker = createVisitorBlocker(bounds, i, baseCount);
    if (blocker) visitorSession.blockers.push(blocker);
  }
  ensureChattyAssignments();
}

function distributedSpawnPosition(index, total, bounds) {
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const columns = Math.max(1, Math.ceil(Math.sqrt(total)));
  const rows = Math.max(1, Math.ceil(total / columns));
  const cellWidth = width / columns;
  const cellHeight = height / rows;
  const col = index % columns;
  const row = Math.floor(index / columns);
  const baseX = bounds.minX + cellWidth * (col + 0.5);
  const baseY = bounds.minY + cellHeight * (row + 0.5);
  const jitterX = (Math.random() - 0.5) * cellWidth * 0.5;
  const jitterY = (Math.random() - 0.5) * cellHeight * 0.5;
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, baseX + jitterX)),
    y: Math.max(bounds.minY, Math.min(bounds.maxY, baseY + jitterY)),
  };
}

function getPlayfieldBounds() {
  const paddingX = 48;
  const paddingY = 48;
  return {
    minX: paddingX,
    maxX: canvas.width - paddingX,
    minY: HUD_HEIGHT + paddingY,
    maxY: canvas.height - paddingY,
  };
}

function randomSpreadPosition(bounds = null) {
  const area = bounds || getPlayfieldBounds();
  const minX = area.minX;
  const maxX = area.maxX;
  const minY = area.minY;
  const maxY = area.maxY;
  return {
    x: randomInRange(minX, Math.max(minX + 1, maxX)),
    y: randomInRange(minY, Math.max(minY + 1, maxY)),
  };
}

function clampPointToBounds(area, x, y) {
  return {
    x: Math.max(area.minX, Math.min(area.maxX, x)),
    y: Math.max(area.minY, Math.min(area.maxY, y)),
  };
}

function pushPointAwayFromCenter(area, point, ratio) {
  if (!ratio || ratio <= 0) return point;
  const centerX = (area.minX + area.maxX) / 2;
  const centerY = (area.minY + area.maxY) / 2;
  const dx = point.x - centerX;
  const dy = point.y - centerY;
  const dist = Math.hypot(dx, dy);
  const maxRadius = Math.min(area.maxX - area.minX, area.maxY - area.minY) * 0.5;
  const avoidRadius = maxRadius * ratio;
  if (dist === 0) {
    return clampPointToBounds(area, centerX + avoidRadius, centerY);
  }
  if (dist >= avoidRadius) return point;
  const pushAmount = (avoidRadius - dist) + avoidRadius * 0.2;
  const nx = dx / dist;
  const ny = dy / dist;
  return clampPointToBounds(area, point.x + nx * pushAmount, point.y + ny * pushAmount);
}

function gridSpreadPosition(index, total, bounds = null, options = {}) {
  const area = bounds || getPlayfieldBounds();
  const width = Math.max(1, area.maxX - area.minX);
  const height = Math.max(1, area.maxY - area.minY);
  const totalCount = Math.max(1, total);
  const columnsOverride = Number.isFinite(options.columns) && options.columns > 0 ? Math.floor(options.columns) : null;
  const minColumns = Math.max(1, options.minColumns || 1);
  const baseColumns = Math.max(1, Math.ceil(Math.sqrt(totalCount)));
  const columns = columnsOverride || Math.max(minColumns, baseColumns);
  const rowsOverride = Number.isFinite(options.rows) && options.rows > 0 ? Math.floor(options.rows) : null;
  const rows = rowsOverride || Math.max(1, Math.ceil(totalCount / columns));
  const slotCount = columns * rows;
  const seed = Number.isFinite(options.seed) ? options.seed : 0;
  const slotIndex = ((index + seed) % slotCount + slotCount) % slotCount;
  const col = slotIndex % columns;
  const row = Math.floor(slotIndex / columns);
  const clampRange = (value) => Math.max(0, Math.min(1, value));
  const xRange = options.xRange || [0, 1];
  const yRange = options.yRange || [0, 1];
  const xStart = area.minX + width * clampRange(xRange[0] ?? 0);
  const xEnd = area.minX + width * clampRange(xRange[1] ?? 1);
  const yStart = area.minY + height * clampRange(yRange[0] ?? 0);
  const yEnd = area.minY + height * clampRange(yRange[1] ?? 1);
  const spanWidth = Math.max(1, xEnd - xStart);
  const spanHeight = Math.max(1, yEnd - yStart);
  const cellWidth = spanWidth / columns;
  const cellHeight = spanHeight / rows;
  const jitterRatio = Math.max(0, Math.min(0.48, options.jitterRatio ?? 0.35));
  const baseX = xStart + cellWidth * (col + 0.5);
  const baseY = yStart + cellHeight * (row + 0.5);
  const jitterX = (Math.random() - 0.5) * cellWidth * jitterRatio * 2;
  const jitterY = (Math.random() - 0.5) * cellHeight * jitterRatio * 2;
  let point = {
    x: baseX + jitterX,
    y: baseY + jitterY,
  };
  point = pushPointAwayFromCenter(area, point, options.avoidCenterRatio || 0);
  return clampPointToBounds(area, point.x, point.y);
}

function pickAnchorWanderPoint(entity, bounds, maxRadius = 150) {
  const area = bounds || getPlayfieldBounds();
  const anchorX = Math.max(area.minX, Math.min(area.maxX, entity.homeX ?? entity.x ?? (area.minX + area.maxX) / 2));
  const anchorY = Math.max(area.minY, Math.min(area.maxY, entity.homeY ?? entity.y ?? (area.minY + area.maxY) / 2));
  const radius = Math.max(20, maxRadius);
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.random() * radius;
  const targetX = anchorX + Math.cos(angle) * distance;
  const targetY = anchorY + Math.sin(angle) * distance;
  return clampPointToBounds(area, targetX, targetY);
}

function assignHomeWanderTarget(entity, bounds, radius = 140) {
  const point = pickAnchorWanderPoint(entity, bounds, radius);
  entity.targetX = point.x;
  entity.targetY = point.y;
  return point;
}

function getCongregationSpawnAreaSpecs(total = CONGREGATION_MEMBER_COUNT) {
  const paddingX = 60;
  const paddingTop = HUD_HEIGHT + 140;
  const paddingBottom = 100;
  const areaWidth = Math.max(120, canvas.width - paddingX * 2);
  const areaHeight = Math.max(120, canvas.height - paddingTop - paddingBottom);
  const bounds = {
    minX: paddingX,
    maxX: paddingX + areaWidth,
    minY: paddingTop,
    maxY: paddingTop + areaHeight,
  };
  const minColumns = 5;
  const totalCount = Math.max(1, total);
  const columns = Math.max(minColumns, Math.ceil(Math.sqrt(totalCount)));
  const rows = Math.max(1, Math.ceil(totalCount / columns));
  const cellWidth = areaWidth / columns;
  const cellHeight = areaHeight / rows;
  return { bounds, columns, rows, cellWidth, cellHeight };
}

function congregationStyleGridPosition(index, total, { jitterRatio = 0.3 } = {}) {
  const spec = getCongregationSpawnAreaSpecs(Math.max(1, total));
  return gridSpreadPosition(index, total, spec.bounds, {
    columns: spec.columns,
    rows: spec.rows,
    jitterRatio,
  });
}

function ensureChattyAssignments() {
  if (visitorSession.summaryActive) return;
  if (!Array.isArray(visitorSession.blockers)) return;
  const desired = 1;
  if (!(visitorSession.activeChatty instanceof Set)) {
    visitorSession.activeChatty = new Set();
  }
  const activeSet = visitorSession.activeChatty;
  visitorSession.blockers.forEach((blocker) => {
    if (!blocker || !blocker.id) return;
    if (
      !blocker.isChatty ||
      blocker.quieted ||
      !blocker.crowding
    ) {
      if (activeSet.has(blocker.id)) {
        activeSet.delete(blocker.id);
        clearChattyLine(blocker);
      }
      if (!blocker.quieted) {
        blocker.crowding = false;
        blocker.ignoreEntityCollisions = false;
        blocker.waiting = blocker.isChatty;
      }
    }
  });
  for (const blocker of visitorSession.blockers) {
    if (activeSet.size >= desired) break;
    if (!blocker || !blocker.isChatty || blocker.quieted || blocker.crowding) continue;
    const wasActive = activeSet.has(blocker.id);
    blocker.crowding = true;
    blocker.ignoreEntityCollisions = true;
    blocker.waiting = false;
    activeSet.add(blocker.id);
    const line = ensureChattyLine(blocker);
    if (!wasActive || !blocker.speechBubble) {
      blocker.chattyLine = line;
      showBlockerSpeech(blocker);
    }
  }
}

function ensureChattyLine(blocker) {
  if (!blocker || !blocker.id) return randomChoice(VISITOR_BLOCKER_LINES) || VISITOR_BLOCKER_LINES[0];
  if (!(visitorSession.chattyLines instanceof Map)) {
    visitorSession.chattyLines = new Map();
  }
  if (!(visitorSession.usedChattyLines instanceof Set)) {
    visitorSession.usedChattyLines = new Set();
  }
  const map = visitorSession.chattyLines;
  const usedChattyLines = visitorSession.usedChattyLines;
  if (map.has(blocker.id)) {
    blocker.chattyLine = map.get(blocker.id);
    return blocker.chattyLine;
  }
  const used = new Set([...map.values(), ...usedChattyLines]);
  const candidates = VISITOR_BLOCKER_LINES.filter((line) => !used.has(line));
  const line =
    randomChoice(candidates.length ? candidates : VISITOR_BLOCKER_LINES) ||
    VISITOR_BLOCKER_LINES[0];
  map.set(blocker.id, line);
  usedChattyLines.add(line);
  blocker.chattyLine = line;
  return line;
}

function clearChattyLine(blocker) {
  if (!(visitorSession.chattyLines instanceof Map)) return;
  if (!blocker || !blocker.id) return;
  visitorSession.chattyLines.delete(blocker.id);
  blocker.chattyLine = "";
}

function releaseChattyBlocker(blocker) {
  if (!blocker) return;
  const activeSet =
    visitorSession.activeChatty instanceof Set ? visitorSession.activeChatty : (visitorSession.activeChatty = new Set());
  activeSet.delete(blocker.id);
  clearChattyLine(blocker);
  blocker.crowding = false;
  blocker.ignoreEntityCollisions = false;
  blocker.waiting = false;
  blocker.engaged = false;
  const locking =
    visitorSession.lockingBlockers instanceof Set ? visitorSession.lockingBlockers : (visitorSession.lockingBlockers = new Set());
  locking.delete(blocker.id);
  visitorSession.movementLock = locking.size > 0;
  ensureChattyAssignments();
}

function createVisitorGuest(bounds, index = 0, total = VISITOR_GUEST_COUNT) {
  // NOTE: Names are assigned to visitor guests via 'name', but currently not showing up in-game.
  // TODO: Fix visitor NPC name display in future update.
  const gender = normalizeNpcGender();
  const appearance = createRandomNpcLayers(gender);
  if (!appearance) return null;
  const animator = new CozyNpcAnimator({
    animations: appearance.animations,
    shadow: appearance.shadow ?? null,
  });
  animator.setState("walk", { restart: true });
  animator.setMoving(true);
  const spawnPoint = congregationStyleGridPosition(index, total);
  // Assign a name from the global NPC name list
  const name = pickNameForGender(gender);
  const guest = {
    id: `guest_${Date.now()}_${index}`,
    type: "guest",
    animator,
    appearance,
    radius: NPC_RADIUS,
    maxFaith: VISITOR_GUEST_MAX_FAITH,
    faith: 0,
    x: spawnPoint.x,
    y: spawnPoint.y,
    targetX: spawnPoint.x,
    targetY: spawnPoint.y,
    speed: randomInRange(44, 62),
    saved: false,
    highlightTimer: 0,
    portrait: null,
    homeX: spawnPoint.x,
    homeY: spawnPoint.y,
    wanderRadius: 120,
    name,
    gender,
  };
  assignHomeWanderTarget(guest, bounds, guest.wanderRadius);
  guest.portrait = captureVisitorPortrait(guest);
  return guest;
}

function createVisitorFromNpcOffscreen(bounds, npc, side = "left") {
  if (!npc || !npc.appearance) return null;
  const appearance = npc.appearance;
  const animator = new CozyNpcAnimator({
    animations: appearance.animations,
    shadow: appearance.shadow ?? null,
  });
  animator.setState("walk", { restart: true });
  animator.setMoving(true);
  const margin = 60;
  const startX = side === "left" ? bounds.minX - margin : bounds.maxX + margin;
  const startY = randomInRange(bounds.minY, bounds.maxY);
  const targetX = (bounds.minX + bounds.maxX) / 2 + randomInRange(-40, 40);
  const targetY = (bounds.minY + bounds.maxY) / 2 + randomInRange(-40, 40);
  const name = npc.name || `Guest ${Math.floor(Math.random() * 1000)}`;
  const guest = {
    id: `guest_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    type: "guest",
    animator,
    appearance,
    radius: NPC_RADIUS,
    maxFaith: VISITOR_GUEST_MAX_FAITH,
    faith: 0,
    x: startX,
    y: startY,
    targetX,
    targetY,
    speed: randomInRange(44, 62),
    saved: false,
    highlightTimer: 0,
    portrait: null,
    homeX: targetX,
    homeY: targetY,
    wanderRadius: 120,
    name,
  };
  return guest;
}

function createVisitorBlocker(bounds, index = 0, total = VISITOR_GUEST_COUNT) {
  const appearance = createRandomNpcLayers();
  if (!appearance) return null;
  const animator = new CozyNpcAnimator({
    animations: appearance.animations,
    shadow: appearance.shadow ?? null,
  });
  animator.setState("walk", { restart: true });
  animator.setMoving(true);
  const isChatty = index < Math.ceil(Math.max(1, total) / 2);
  const spawnPoint = congregationStyleGridPosition(index, total);
  const blocker = {
    id: `blocker_${Date.now()}_${index}`,
    type: "blocker",
    animator,
    radius: NPC_RADIUS,
    x: Math.max(bounds.minX, Math.min(bounds.maxX, spawnPoint.x)),
    y: Math.max(bounds.minY, Math.min(bounds.maxY, spawnPoint.y)),
    speed: randomInRange(36, 58),
    crowding: false,
    hitsTaken: 0,
    speechBubble: null,
    targetX: spawnPoint.x,
    targetY: spawnPoint.y,
    quieted: false,
    isChatty,
    waiting: isChatty,
    engaged: false,
    homeX: Math.max(bounds.minX, Math.min(bounds.maxX, spawnPoint.x)),
    homeY: Math.max(bounds.minY, Math.min(bounds.maxY, spawnPoint.y)),
    wanderRadius: 160,
  };
  assignHomeWanderTarget(blocker, bounds, blocker.wanderRadius);
  return blocker;
}

function updateVisitorSession(dt) {
  if (!visitorSession.active) return;
  if (visitorSession.summaryActive) {
    visitorSession.timer = 0;
    return;
  }
  visitorSession.timer = Math.max(0, visitorSession.timer - dt);
  if (visitorSession.timer <= 0 && !visitorSession.summaryActive) {
    visitorSession.timer = 0;
    visitorSession.summaryActive = true;
    visitorSession.summaryReason = "timer";
    visitorSession.lockingBlockers = new Set();
    visitorSession.movementLock = false;
    visitorSession.activeChatty = new Set();
    visitorSession.blockers.forEach((blocker) => {
      blocker.crowding = false;
      blocker.ignoreEntityCollisions = false;
      blocker.engaged = false;
      blocker.waiting = false;
    });
    visitorSession.awaitingSummaryConfirm = true;
    return;
  }
  updateVisitorGuests(dt);
  updateVisitorBlockers(dt);
  updateVisitorProjectiles(dt);
  updateBossHazards(dt);
  updateFloatingTexts(dt);
  updateLevelAnnouncements(dt);
  updateDevStatus(dt);
  updateEffects(dt);
  if (!visitorSession.summaryActive && visitorSession.visitors.length && visitorSession.visitors.every((guest) => guest.saved)) {
    visitorSession.summaryActive = true;
    visitorSession.timer = 0;
    visitorSession.summaryReason = "allSaved";
    visitorSession.lockingBlockers = new Set();
    visitorSession.movementLock = false;
    visitorSession.activeChatty = new Set();
    visitorSession.blockers.forEach((blocker) => {
      blocker.crowding = false;
      blocker.ignoreEntityCollisions = false;
      blocker.engaged = false;
      blocker.waiting = false;
    });
    visitorSession.awaitingSummaryConfirm = true;
    return;
  }
}

function updateVisitorGuests(dt) {
  const bounds = visitorSession.bounds || getNpcHomeBounds();
  const guests = visitorSession.visitors;
  // Maintain at least 3 unsaved visitors by spawning new ones offscreen (left/right).
  const unsaved = guests.filter((g) => g && !g.saved);
  const needed = Math.max(0, 3 - unsaved.length);
  if (needed > 0) {
    const used = visitorSession.usedNpcIds instanceof Set ? visitorSession.usedNpcIds : (visitorSession.usedNpcIds = new Set());
    const candidates = npcs.filter(
      (npc) =>
        npc &&
        npc.active &&
        !npc.departed &&
        npc.state !== "lostFaith" &&
        npc.state !== "drained" &&
        !used.has(npc.id || npc.name),
    );
    for (let i = 0; i < needed; i += 1) {
      if (!candidates.length) break;
      const side = Math.random() < 0.5 ? "left" : "right";
      const idx = Math.floor(Math.random() * candidates.length);
      const npc = candidates.splice(idx, 1)[0];
      const guest = createVisitorFromNpcOffscreen(bounds, npc, side);
      if (guest) {
        visitorSession.visitors.push(guest);
        if (npc.id) used.add(npc.id);
        else if (npc.name) used.add(npc.name);
      }
    }
  }
  guests.forEach((guest) => {
    guest.animator.update(dt);
    const dx = (guest.targetX ?? guest.x) - guest.x;
    const dy = (guest.targetY ?? guest.y) - guest.y;
    const dist = Math.hypot(dx, dy);
    if (!dist || dist < 6) {
      assignHomeWanderTarget(guest, bounds, guest.wanderRadius || 130);
    } else {
      const step = guest.speed * dt;
      const nx = dx / dist;
      const ny = dy / dist;
      guest.x += nx * step;
      guest.y += ny * step;
      guest.animator.setDirectionFromVector(nx, ny);
      guest.animator.setMoving(true);
    }
    if (guest.highlightTimer > 0) guest.highlightTimer = Math.max(0, guest.highlightTimer - dt);
    resolveEntityObstacles(guest);
    clampEntityToBounds(guest);
  });
  guests.forEach((guest) => {
    resolveEntityCollisions(guest, guests, { allowPush: true, overlapScale: 0.9 });
    resolveEntityCollisions(guest, visitorSession.blockers, { allowPush: true, overlapScale: 0.9 });
  });
}

function updateVisitorBlockers(dt) {
  const bounds = visitorSession.bounds || getNpcHomeBounds();
  const blockers = visitorSession.blockers;
  ensureChattyAssignments();
  blockers.forEach((blocker) => {
    blocker.animator.update(dt);
    const isActiveChatter = blocker.isChatty && blocker.crowding && !blocker.quieted;
    if (isActiveChatter && player) {
      if (blocker.engaged) {
        alignBlockerAtPlayer(blocker);
      } else {
        const dx = player.x - blocker.x;
        const dy = player.y - blocker.y;
        const dist = Math.hypot(dx, dy) || 1;
        const speedScale = blocker.isChatty ? 0.7 : 1;
        const speed = blocker.speed * 2.0 * speedScale;
        blocker.x += (dx / dist) * speed * dt;
        blocker.y += (dy / dist) * speed * dt;
        blocker.animator.setDirectionFromVector(dx, dy);
        blocker.animator.setMoving(true);
        if (circleIntersectsPlayerHurtbox(blocker.x, blocker.y, blocker.radius + 6, player)) {
          blocker.engaged = true;
          const locking =
            visitorSession.lockingBlockers instanceof Set
              ? visitorSession.lockingBlockers
              : (visitorSession.lockingBlockers = new Set());
          locking.add(blocker.id);
          visitorSession.movementLock = locking.size > 0;
          alignBlockerAtPlayer(blocker);
          showBlockerSpeech(blocker);
          // Start 'conversation' timer if not already started
          if (!blocker.conversationTimer) {
            blocker.conversationTimer = 2.0; // seconds
          }
        }
      }
    } else {
      wanderBlocker(blocker, bounds, dt);
      if (blocker.speechBubble && !blocker.crowding) {
        blocker.speechBubble.life = 0;
        blocker.speechBubble = null;
      }
    }
    // Handle conversation timer and appeasement
    if (blocker.engaged && blocker.conversationTimer) {
      blocker.conversationTimer -= dt;
      if (blocker.conversationTimer <= 0) {
        blocker.conversationTimer = null;
        blocker.quieted = true;
        blocker.engaged = false;
        releaseChattyBlocker(blocker);
        const bounds = visitorSession.bounds || getNpcHomeBounds();
        blocker.targetX = randomInRange(bounds.minX, bounds.maxX);
        blocker.targetY = randomInRange(bounds.minY, bounds.maxY);
        if (blocker.speechBubble) {
          blocker.speechBubble.life = 0;
          blocker.speechBubble = null;
        }
        visitorSession.lockingBlockers.delete(blocker.id);
        visitorSession.movementLock = visitorSession.lockingBlockers.size > 0;
        visitorSession.quietedBlockers += 1;
        npcCheer(blocker, "Thanks, pastor!", "#f4fbff", { life: 0.9 });
      }
    }
    resolveEntityObstacles(blocker);
    clampEntityToBounds(blocker);
  });
  blockers.forEach((blocker) => {
    resolveEntityCollisions(blocker, blockers, { allowPush: true, overlapScale: 0.95 });
  });
  if (player) {
    resolveEntityCollisions(player, blockers, { allowPush: true, overlapScale: 0.95 });
  }
}

function wanderBlocker(blocker, bounds, dt) {
  const dx = (blocker.targetX ?? blocker.x) - blocker.x;
  const dy = (blocker.targetY ?? blocker.y) - blocker.y;
  const dist = Math.hypot(dx, dy);
  if (!dist || dist < 8) {
    assignHomeWanderTarget(blocker, bounds, blocker.wanderRadius || 170);
  } else {
    const nx = dx / dist;
    const ny = dy / dist;
    const speedScale = blocker.isChatty ? 0.7 : 1;
    blocker.x += nx * blocker.speed * 0.8 * speedScale * dt;
    blocker.y += ny * blocker.speed * 0.8 * speedScale * dt;
    blocker.animator.setDirectionFromVector(nx, ny);
    blocker.animator.setMoving(true);
  }
}

function alignBlockerAtPlayer(blocker) {
  if (!player) return;
  const dx = player.x - blocker.x;
  const dy = player.y - blocker.y;
  const dist = Math.hypot(dx, dy) || 1;
  const playerHurtbox = getPlayerHitboxRect(player);
  const contactDistance = (playerHurtbox
    ? Math.max(playerHurtbox.width, playerHurtbox.height) * 0.5
    : player.radius || 24) + blocker.radius + 4;
  blocker.x = player.x - (dx / dist) * contactDistance;
  blocker.y = player.y - (dy / dist) * contactDistance;
  blocker.animator.setDirectionFromVector(dx, dy);
  blocker.animator.setMoving(false);
  showBlockerSpeech(blocker);
}

function updateVisitorProjectiles(dt) {
  if (!projectiles.length) return;
  const visitors = visitorSession.visitors;
  const blockers = visitorSession.blockers;
  const checkList = visitors.concat(blockers);
  projectiles.forEach((projectile) => {
    projectile.update(dt);
    if (!projectile.friendly) {
      projectile.dead = true;
      return;
    }
    if (projectile.dead) return;
    for (const entity of checkList) {
      if (!entity || entity.removed) continue;
      if (projectile.hitEntities && projectile.hitEntities.has(entity)) continue;
      if (visitorSession.movementLock) {
        const activeChatty =
          entity.type === "blocker" &&
          entity.isChatty &&
          !entity.quieted &&
          entity.crowding;
        if (!activeChatty) continue;
      }
      const hitRadius = (entity.radius || NPC_RADIUS) + (projectile.radius || 12);
      const dx = entity.x - projectile.x;
      const dy = entity.y - projectile.y;
      if (Math.hypot(dx, dy) <= hitRadius) {
        if (projectile.hitEntities) {
          projectile.hitEntities.add(entity);
        }
        applyHeartToEntity(entity, { flash: true });
        playVisitorHitSfx(0.85);
        projectile.onHit(entity);
        if (projectile.dead) break;
      }
    }
  });
  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    if (projectiles[i].dead) {
      projectiles.splice(i, 1);
    }
  }
}

function showBlockerSpeech(blocker) {
  if (!blocker || blocker.speechBubble) return;
  const line = blocker.chattyLine || ensureChattyLine(blocker);
  blocker.speechBubble = addFloatingTextAt(blocker.x, blocker.y - blocker.radius - 24, line, "#f4fbff", {
    speechBubble: true,
    bubbleTheme: "npc",
    entity: blocker,
    offsetY: -blocker.radius - 24,
    life: 999,
    persist: true,
    priority: 140,
  });
}

function markVisitorGuestSaved(guest) {
  if (!guest || guest.saved) return;
  guest.saved = true;
  playVisitorSavedSfx(0.85);
  if (visitorSession) {
    visitorSession.savedVisitors = (visitorSession.savedVisitors || 0) + 1;
    visitorSession.newMemberPortraits = visitorSession.newMemberPortraits || [];
    visitorSession.newMemberNames = visitorSession.newMemberNames || [];
    if (guest.portrait) {
      visitorSession.newMemberPortraits.push(guest.portrait);
      visitorSession.newMemberNames.push(guest.name || "");
    }
  }
  seasonStats.visitorAdded = (seasonStats.visitorAdded || 0) + 1;
  adjustCongregationSize(1);
  spawnRayboltEffect(guest.x, guest.y - guest.radius / 2, (guest.radius || 28) * 1.5);
  npcCheer(guest, "I love it here!", "#f4fbff", { life: 1.3 });
}

function applyHeartToEntity(entity, options = {}) {
  if (!entity) return;
  if (entity.type === "guest") {
    if (entity.saved) {
      spawnVisitorHeartHitEffect(entity.x, entity.y - entity.radius / 2, { radius: entity.radius || 28 });
      return;
    }
    entity.faith = Math.min(entity.maxFaith, entity.faith + HEART_FAITH_PER_HIT);
    entity.highlightTimer = 0.4;
    addFloatingTextAt(entity.x, entity.y - entity.radius - 18, "Welcome +1", "#5FE3C0", {
      life: 0.6,
      vy: -18,
    });
    if (options.flash) {
      try {
        if (typeof entity.animator?.flash === "function") {
          entity.animator.flash({ duration: 0.25, intensity: 1 });
        }
      } catch (e) {
        entity.highlightTimer = 0.4;
      }
      spawnFlashEffect(entity.x, entity.y - (entity.radius || 28) / 2);
    }
    if (!entity.saved && entity.faith >= entity.maxFaith) {
      markVisitorGuestSaved(entity);
    }
    return;
  }
  if (entity.type === "blocker") {
    const isActiveChatty = Boolean(entity.isChatty && entity.crowding && !entity.quieted);
    entity.hitsTaken = (entity.hitsTaken || 0) + 1;
    if (options.flash) {
      if (isActiveChatty) {
        try {
          if (typeof entity.animator?.flash === "function") {
            entity.animator.flash({ color: "#9BD9FF", duration: 0.35, intensity: 1.6 });
          }
        } catch (e) {}
        spawnMagicImpactEffect(entity.x, entity.y - (entity.radius || 26) / 2);
        spawnChattyHeartHitEffect(entity.x, entity.y - (entity.radius || 26) / 2, {
          radius: entity.radius || 26,
        });
      } else {
        try {
          if (typeof entity.animator?.flash === "function") {
            entity.animator.flash({ duration: 0.28, intensity: 1.2 });
          }
        } catch (e) {}
        spawnVisitorHeartHitEffect(entity.x, entity.y - (entity.radius || 26) / 2, {
          radius: entity.radius || 26,
        });
      }
    }
    if (entity.hitsTaken >= VISITOR_BLOCKER_HITS_REQUIRED && entity.crowding) {
      spawnChattyAppeaseEffect(entity.x, entity.y - entity.radius / 2, {
        radius: entity.radius || 26,
      });
      entity.quieted = true;
      releaseChattyBlocker(entity);
      const bounds = visitorSession.bounds || getNpcHomeBounds();
      entity.targetX = randomInRange(bounds.minX, bounds.maxX);
      entity.targetY = randomInRange(bounds.minY, bounds.maxY);
      if (entity.speechBubble) {
        entity.speechBubble.life = 0;
        entity.speechBubble = null;
      }
      visitorSession.quietedBlockers += 1;
      npcCheer(entity, "Thanks, pastor!", "#f4fbff", { life: 0.9 });
    }
  }
}

function boostVisitorFaithFromPrayerBomb(ratio = 0.5) {
  if (!visitorSession || !visitorSession.active) return;
  const guests = Array.isArray(visitorSession.visitors) ? visitorSession.visitors : [];
  const boostRatio = Math.max(0, ratio);
  if (!guests.length || boostRatio <= 0) return;
  guests.forEach((guest) => {
    if (!guest || guest.saved) return;
    const maxFaith = Math.max(1, guest.maxFaith || VISITOR_GUEST_MAX_FAITH);
    const gain = Math.max(1, Math.round(maxFaith * boostRatio));
    const previousFaith = guest.faith || 0;
    const nextFaith = Math.min(maxFaith, previousFaith + gain);
    if (nextFaith <= previousFaith) return;
    guest.faith = nextFaith;
    guest.highlightTimer = 0.6;
    const percent = Math.round((gain / maxFaith) * 100);
    addFloatingTextAt(guest.x, guest.y - guest.radius - 24, `Prayer Boost +${percent}%`, "#EAF6FF", {
      life: 0.9,
      vy: -14,
    });
    if (guest.faith >= maxFaith) {
      markVisitorGuestSaved(guest);
    }
  });
}

if (typeof window !== "undefined") {
  window.boostVisitorFaithFromPrayerBomb = boostVisitorFaithFromPrayerBomb;
}

function buildCongregationMembers(count = CONGREGATION_MEMBER_COUNT) {
  congregationMembers.splice(0, congregationMembers.length);
  congregationWanderBounds = null;
  congregationDialogueIndex = 0;
  if (!assets?.npcs) return;
  const total = Math.max(0, count);
  if (total === 0) return;
  const spec = getCongregationSpawnAreaSpecs(total);
  const { bounds, columns, rows, cellWidth, cellHeight } = spec;

  congregationWanderBounds = bounds;

  // Name assignment setup
  ensureNpcNamesList();
  if (!Number.isFinite(window.npcNameIndex)) window.npcNameIndex = 0;
  for (let i = 0; i < total; i += 1) {
    const gender = normalizeNpcGender();
    const appearance = createRandomNpcLayers(gender);
    if (!appearance) break;
    const animator = new CozyNpcAnimator({
      animations: appearance.animations,
      shadow: appearance.shadow ?? null,
    });
    animator.setState("walk", { restart: true });
    animator.setMoving(true);
    const column = i % columns;
    const row = Math.floor(i / columns);
    const jitterX = (Math.random() - 0.5) * cellWidth * 0.3;
    const jitterY = (Math.random() - 0.5) * cellHeight * 0.3;
    const baseX = bounds.minX + cellWidth * (column + 0.5) + jitterX;
    const baseY = bounds.minY + cellHeight * (row + 0.5) + jitterY;
    const name = pickNameForGender(gender) || `Friend ${i + 1}`;
    const member = {
      animator,
      x: baseX,
      y: baseY,
      baseX,
      baseY,
      radius: CONGREGATION_MEMBER_RADIUS,
      bobTimer: Math.random() * Math.PI * 2,
      wanderPause: Math.random() * 1.5,
      speed: randomInRange(22, 36) * WORLD_SCALE,
      name,
      gender,
    };
    assignCongregationTarget(member, { immediate: true });
    congregationMembers.push(member);
  }
}

function clearCongregationMembers() {
  congregationMembers.splice(0, congregationMembers.length);
  congregationWanderBounds = null;
}

function clearCongregationSpeechBubbles() {
  const congregationSet = new Set(congregationMembers);
  floatingTexts.forEach((ft) => {
    if (!ft?.speechBubble) return;
    if (ft.entity === player || congregationSet.has(ft.entity)) {
      ft.life = 0;
    }
  });
  congregationMembers.forEach((member) => {
    if (member?.dialogueBubble) {
      member.dialogueBubble.life = 0;
      member.dialogueBubble = null;
    }
  });
}

function assignCongregationTarget(member, { immediate = false } = {}) {
  if (!congregationWanderBounds) return;
  member.targetX = randomInRange(congregationWanderBounds.minX, congregationWanderBounds.maxX);
  member.targetY = randomInRange(congregationWanderBounds.minY, congregationWanderBounds.maxY);
  member.wanderPause = immediate ? 0 : randomInRange(0.6, 1.8);
}

function updateCongregationMembers(dt) {
  if (!congregationMembers.length) return;
  const bobSpeed = 2.0;
  congregationMembers.forEach((member) => {
    member.bobTimer += dt * bobSpeed;
    member.animator.update(dt);
    member.wanderPause = Math.max(0, (member.wanderPause || 0) - dt);
    const dx = (member.targetX ?? member.baseX) - member.baseX;
    const dy = (member.targetY ?? member.baseY) - member.baseY;
    const dist = Math.hypot(dx, dy);
    if (member.wanderPause <= 0 && dist > 2) {
      const step = Math.min(dist, (member.speed || 28) * dt);
      const nx = dx / dist;
      const ny = dy / dist;
      member.baseX += nx * step;
      member.baseY += ny * step;
    } else if (dist <= 2) {
      assignCongregationTarget(member);
    }
    member.x = member.baseX;
    member.y = member.baseY + Math.sin(member.bobTimer) * 4;
  });
}

function updatePlayerDuringCongregation(dt) {
  if (!player) return;
  updateAimFromKeyboard();
  updateAimAssist();

    if (keysJustPressed.has("ArrowDown")) {
      playerDashState.pendingDashTimer = DASH_COMBO_GRACE;
      playerDashState.pendingDashDir = getDashButtonDirection();
      playerDashState.pendingComboCPressed = false;
    }
    if (playerDashState.pendingDashTimer > 0 && keysJustPressed.has("ArrowRight")) {
      playerDashState.pendingComboCPressed = true;
    }
    if (playerDashState.pendingDashTimer > 0) {
      const comboSwipe = window.Input?.peekComboSwipe?.();
      const comboSwipeActive =
        keysPressed.has("ArrowLeft") ||
        playerDashState.pendingComboCPressed ||
        (comboSwipe && ((comboSwipe.from === "A" && comboSwipe.to === "B") || (comboSwipe.from === "B" && comboSwipe.to === "A")));
      if (comboSwipeActive) {
        playerDashState.pendingDashTimer = 0;
      } else {
        playerDashState.pendingDashTimer = Math.max(0, playerDashState.pendingDashTimer - dt);
        if (playerDashState.pendingDashTimer === 0) {
          if (tryStartDash(playerDashState.pendingDashDir)) {
            keysJustPressed.delete("ArrowDown");
          }
        }
      }
    }

  // Update dash movement
  if (playerDashState.isDashing) {
    updateDashMovement(dt);
  }

  // Suppress prayer bomb before player.update consumes it.
  // Must re-derive bothFull here rather than relying on acSuperArmed, because acSuperArmed
  // is set by updatePlayer's pre-suppression block which runs AFTER this player.update() call.
  if (window._meleeAttackState && player && typeof Input !== "undefined") {
    const _ms = window._meleeAttackState;
    const prayerSuperCost = (player.prayerChargeRequired || 60) / 3;
    const aFullyCharged =
      _ms.isCharging &&
      _ms.buttonDown &&
      _ms.chargeTimer >= (_ms.holdTime || 0);
    const acComboActive =
      _ms.acSuperArmed ||
      (aFullyCharged && player.prayerHoldLocked && (player.prayerCharge || 0) >= prayerSuperCost) ||
      (aFullyCharged && keysPressed.has("ArrowRight"));
    if (acComboActive || _ms.spinButtonDown || _ms.bcTeleportArmed) {
      Input.prayerBombClickQueued = false;
    }
  }
  player.update(dt);
  clampEntityToBounds(player);
}

function clampToWanderBounds(member) {
  if (!congregationWanderBounds || !member) return;
  member.baseX = Math.max(congregationWanderBounds.minX, Math.min(congregationWanderBounds.maxX, member.baseX));
  member.baseY = Math.max(congregationWanderBounds.minY, Math.min(congregationWanderBounds.maxY, member.baseY));
}

function resolveCongregationCollisions() {
  if (!player || !congregationMembers.length) return;
  const playerRadius = player.radius || 24;
  congregationMembers.forEach((member) => {
    const dx = player.x - member.x;
    const dy = player.y - member.y;
    const distance = Math.hypot(dx, dy);
    const minDistance = (member.radius || CONGREGATION_MEMBER_RADIUS) + playerRadius * 0.85;
    if (distance === 0) {
      player.x += (Math.random() - 0.5) * 0.5;
      player.y += (Math.random() - 0.5) * 0.5;
      return;
    }
    if (distance < minDistance) {
      const overlap = minDistance - distance;
      const nx = dx / distance;
      const ny = dy / distance;
      player.x += nx * overlap;
      player.y += ny * overlap;
      player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
      player.y = Math.max(HUD_HEIGHT + player.radius, Math.min(canvas.height - player.radius, player.y));
      member.baseX -= nx * overlap * 0.35;
      member.baseY -= ny * overlap * 0.35;
      clampToWanderBounds(member);
      member.x = member.baseX;
      member.y = member.baseY + Math.sin(member.bobTimer) * 4;
    }
  });
}

function resolveCongregationMemberCollisions() {
  const count = congregationMembers.length;
  if (count <= 1) return;
  for (let i = 0; i < count; i += 1) {
    const a = congregationMembers[i];
    for (let j = i + 1; j < count; j += 1) {
      const b = congregationMembers[j];
      const dx = a.baseX - b.baseX;
      const dy = a.baseY - b.baseY;
      const distance = Math.hypot(dx, dy);
      const minDistance = (a.radius || CONGREGATION_MEMBER_RADIUS) + (b.radius || CONGREGATION_MEMBER_RADIUS);
      if (distance === 0) {
        const nudge = 0.5;
        a.baseX += nudge;
        b.baseX -= nudge;
        continue;
      }
      if (distance < minDistance) {
        const overlap = (minDistance - distance) * 0.5;
        const nx = dx / distance;
        const ny = dy / distance;
        a.baseX += nx * overlap;
        a.baseY += ny * overlap;
        b.baseX -= nx * overlap;
        b.baseY -= ny * overlap;
        clampToWanderBounds(a);
        clampToWanderBounds(b);
      }
    }
    a.x = a.baseX;
    a.y = a.baseY + Math.sin(a.bobTimer) * 4;
  }
  const last = congregationMembers[count - 1];
  last.x = last.baseX;
  last.y = last.baseY + Math.sin(last.bobTimer) * 4;
}

function getNextCongregationDialogueLine() {
  if (!Array.isArray(CONGREGATION_DIALOGUE_LINES) || !CONGREGATION_DIALOGUE_LINES.length) return null;
  const line = CONGREGATION_DIALOGUE_LINES[congregationDialogueIndex % CONGREGATION_DIALOGUE_LINES.length];
  congregationDialogueIndex = (congregationDialogueIndex + 1) % CONGREGATION_DIALOGUE_LINES.length;
  return line;
}

function triggerCongregationMemberDialogue(member) {
  if (!member) return false;
  const line = getNextCongregationDialogueLine();
  if (!line) return false;
  if (member.dialogueBubble) {
    member.dialogueBubble.life = 0;
    member.dialogueBubble = null;
  }
  const bubble = addFloatingTextAt(
    member.x,
    member.y - member.radius - 20,
    line,
    "#f4fbff",
    {
      speechBubble: true,
      vy: 0,
      life: 6.4,
      entity: member,
      offsetY: -member.radius - 20,
      bubbleTheme: "npc",
    },
  );
  member.dialogueBubble = bubble || null;
  member.dialogueCooldownUntil =
    (typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now()) + CONGREGATION_DIALOGUE_COOLDOWN_MS;
  return Boolean(bubble);
}

function tryTriggerCongregationDialogueFromMelee(dir, swingCenterX, swingCenterY, attackRect) {
  if (!player || !congregationMembers.length) return false;
  const status = typeof levelManager?.getStatus === "function" ? levelManager.getStatus() : null;
  if (status?.stage === "levelIntro") return false;
  const now =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  const attackAngle = Math.atan2(dir.y, dir.x);
  const cos = Math.cos(-attackAngle);
  const sin = Math.sin(-attackAngle);
  let bestMember = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  congregationMembers.forEach((member) => {
    if (!member) return;
    if (Number.isFinite(member.dialogueCooldownUntil) && now < member.dialogueCooldownUntil) return;
    const relX = member.x - player.x;
    const relY = member.y - player.y;
    const hitRadius = member.radius || CONGREGATION_MEMBER_RADIUS;
    let hit = false;
    if (attackRect) {
      const localX = relX * cos - relY * sin;
      const localY = relX * sin + relY * cos;
      hit = circleIntersectsRect(localX, localY, hitRadius, attackRect);
    } else {
      const dx = member.x - swingCenterX;
      const dy = member.y - swingCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= MELEE_SWING_RANGE + hitRadius) {
        const dotProduct = dx * dir.x + dy * dir.y;
        hit = !(dotProduct < 0 && dist > MELEE_CLOSE_RANGE + hitRadius);
      }
    }
    if (!hit) return;
    const distance = Math.hypot(relX, relY);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMember = member;
    }
  });
  if (!bestMember) return false;
  return triggerCongregationMemberDialogue(bestMember);
}

function updateCozyNpcs(dt, options = {}) {
  const previewOnly = Boolean(options?.previewOnly);
  const levelStatus = typeof levelManager?.getStatus === "function" ? levelManager.getStatus() : null;
  const stageName = levelStatus?.stage || "";
  const isVictoryCalmStage =
    stageName === "victoryCelebrate" ||
    (stageName === "graceRush" && graceRushState.reason !== "boss");
  const npcMotionTimeScale = isVictoryCalmStage ? 0.25 : 1;
  const shouldRestoreVictoryNpcAlpha = stageName !== "victoryCelebrate" && stageName !== "graceRush";
  const now =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  if (npcsSuspended) return;
  if (!previewOnly && formationState) {
    formationState.swapCooldown = Math.max(0, (formationState.swapCooldown || 0) - dt);
  }
  if (!previewOnly) {
    updateNpcFormationPressure(dt);
  }
  if (!previewOnly && npcWeaponState.timer > 0) {
    npcWeaponState.timer = Math.max(0, npcWeaponState.timer - dt);
    if (npcWeaponState.timer <= 0) {
      npcWeaponState.mode = null;
      npcWeaponState.duration = 0;
      npcWeaponState.damageMultiplier = 1;
      npcWeaponState.cooldownMultiplier = 1;
      npcWeaponState.speedMultiplier = 1;
    }
  }
  if (!previewOnly) {
    maybeSwapNpcPositions();
  }
  function applyEnemyCollisionDamageToNpc(npcEntity) {
    if (!npcEntity || npcEntity.departed || !npcEntity.active) return;
    if (typeof npcEntity.isEnsnared === "function" && npcEntity.isEnsnared()) return false;
    let damageApplied = false;
    const now =
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();
    for (const enemy of enemies) {
      if (!enemy || enemy.dead || enemy.state === "death") continue;
      if (enemy.type === "ghost") continue;
      const center = getEnemyHitboxCenter(enemy);
      const dx = center.x - npcEntity.x;
      const dy = center.y - npcEntity.y;
      const distance = Math.hypot(dx, dy);
      const overlapRadius = getEnemyHitboxRadius(enemy) + (npcEntity.radius || 0);
      if (distance > overlapRadius) continue;
      enemy._forcedTarget = npcEntity;
      enemy._forcedTargetUntil = now + 800;
      if (!enemy.isRanged && enemy.attackTimer <= 0 && enemy.state !== "attack") {
        enemy.state = "attack";
        if (enemy.animator) enemy.animator.play("attack", { restart: true });
        enemy.attackHitApplied = false;
      }
      if (
        enemy.state === "attack" &&
        Number.isFinite(enemy.config?.attackHitFrame) &&
        enemy.config.attackHitFrame > 0
      ) {
        continue;
      }
      if (isEnemyInKnockback(enemy)) continue;
      if ((npcEntity.damageCooldown || 0) > 0) continue;
      if (npcEntity.faith <= 0) continue;
      const enemyDamage = getEnemyContactDamageValue(enemy);
      if (!enemyDamage) continue;
      // Apply the full configured enemy damage to NPCs (no reduction).
      const scaled = Math.max(1, Math.round(enemyDamage));
      npcEntity.sufferAttack(scaled, { sourceType: enemy.type });
      damageApplied = true;
      break;
    }
    return damageApplied;
  }

  function updateNpcCongregationVolley(npcEntity) {
    const volley = npcEntity?.pendingCongregationVolley || null;
    if (!volley) return false;
    volley.delay = Math.max(0, (volley.delay || 0) - dt);
    if (volley.delay > 0) return true;
    fireCongregationVolleyShot(npcEntity, volley);
    npcEntity.pendingCongregationVolley = null;
    return false;
  }

  function resolveCozyNpcCrowding() {
    if (npcs.length <= 1) return;
    for (let i = 0; i < npcs.length; i += 1) {
      const a = npcs[i];
      if (!a || a.departed || !a.active) continue;
      for (let j = i + 1; j < npcs.length; j += 1) {
        const b = npcs[j];
        if (!b || b.departed || !b.active) continue;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.hypot(dx, dy);
        const minDistance = ((a.radius || NPC_RADIUS) + (b.radius || NPC_RADIUS)) * 0.92;
        if (distance === 0) {
          a.x += 0.75;
          b.x -= 0.75;
          continue;
        }
        if (distance >= minDistance) continue;
        const overlap = (minDistance - distance) * 0.5;
        const nx = dx / distance;
        const ny = dy / distance;
        a.x += nx * overlap;
        a.y += ny * overlap;
        b.x -= nx * overlap;
        b.y -= ny * overlap;
        clampEntityToBounds(a);
        clampEntityToBounds(b);
      }
    }
  }

  for (let i = npcs.length - 1; i >= 0; i -= 1) {
    const npc = npcs[i];
    if (shouldRestoreVictoryNpcAlpha && Number.isFinite(npc?.graceRushNpcFadeAlpha)) {
      npc.graceRushNpcFadeAlpha = 1;
      npc.graceRushFarewellIndex = null;
      npc.graceRushNpcFadeStartAt = null;
      npc.graceRushNpcFadeDurationMs = null;
    } else if (isVictoryCalmStage && Number.isFinite(npc?.graceRushNpcFadeStartAt)) {
      const fadeStartAt = npc.graceRushNpcFadeStartAt;
      const fadeDurationMs = Math.max(300, Number(npc.graceRushNpcFadeDurationMs) || 1200);
      const progress = Math.max(0, Math.min(1, (now - fadeStartAt) / fadeDurationMs));
      npc.graceRushNpcFadeAlpha = Math.max(0, 1 - progress);
    }
    if (!previewOnly) {
      const timerScale = getNpcTimerScale();
      npc.damageCooldown = Math.max(0, (npc.damageCooldown || 0) - dt * timerScale);
    }
    npc.update(dt * npcMotionTimeScale, { previewOnly });

    // Player-touch restores NPCs to full faith
    try {
      if (!previewOnly) {
      const inGraceRush = stageName === "graceRush";
      if (
        ((npc.state === "lostFaith" || npc.state === "drained") || inGraceRush) &&
        player &&
        npc &&
        !npc.departed &&
        npc.active
      ) {
        if (circleIntersectsPlayerHurtbox(npc.x, npc.y, (npc.radius || 20) * 0.7, player)) {
          // Restore up to 50% max faith when touched by the player (drained or not).
          const maxFaith = npc.maxFaith || 1;
          const targetHalf = Math.floor(maxFaith * 0.5);
          const missingToHalf = Math.max(0, targetHalf - (npc.faith || 0));
          if (missingToHalf > 0) {
            const restoredFaith = npc.receiveFaith(missingToHalf, {
              allowFromZero: true,
              bypassSuppression: true,
            });
            if (restoredFaith) {
              spawnFlashEffect(npc.x, npc.y - npc.radius / 2);
            }
          }
        }
      }
      }
    } catch (err) {
      console.warn && console.warn('npc touch restore failed', err);
    }

    // Collision handling: let NPCs interact with other entities and obstacles.
    try {
      const leaving = npc.state === "lostFaith" || (typeof npc.isEnsnared === "function" && npc.isEnsnared());
      if (!leaving) {
        // NPCs should collide with the player (can be pushed), enemies (allow push),
        // other weapon pickups, and utility power-ups so they can't pass through pickups.
        if (!previewOnly) {
          if (player && !npc.departed && npc.active) {
            resolveEntityCollisions(npc, [player], { allowPush: true, overlapScale: 0.85 });
          }
          resolveEntityCollisions(npc, enemies, { allowPush: true, overlapScale: 0.85 });
          resolveEntityCollisions(npc, weaponPickups, { allowPush: true, overlapScale: 0.9 });
          resolveEntityCollisions(npc, churchPowerupPickups, { allowPush: true, overlapScale: 0.9 });
          resolveEntityCollisions(npc, utilityPowerUps, { allowPush: false, overlapScale: 0.9 });
        }
        // Respect world obstacles (trees, walls, etc.) so NPCs don't walk through them.
        resolveEntityObstacles(npc);
        clampEntityToBounds(npc);
        if (!previewOnly) {
          applyEnemyCollisionDamageToNpc(npc);
        }
      }
    } catch (err) {
      console.warn && console.warn('NPC collision resolution failed', err);
    }

    // allow NPCs at full faith to attempt firing at enemies
    const congregationVolleyPending = previewOnly ? false : updateNpcCongregationVolley(npc);
    try {
      if (!previewOnly && !congregationVolleyPending) {
        npc.tryNpcFire(dt);
      }
    } catch (e) {}

    if (npc.departed) {
      npcs.splice(i, 1);
    }
  }
  resolveCozyNpcCrowding();
}

function getCongregationVolleyDirectionForNpc(npc, clusterCenter, playerAim) {
  const laneBase = normalizeVector((npc.x || 0) - clusterCenter.x, (npc.y || 0) - clusterCenter.y);
  const laneDir = laneBase.x !== 0 || laneBase.y !== 0 ? laneBase : playerAim;
  let preferredDir = null;
  let preferredScore = Infinity;
  let fallbackDir = null;
  let fallbackScore = Infinity;

  const evaluate = (targetX, targetY) => {
    const dx = targetX - npc.x;
    const dy = targetY - npc.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= 0) return;
    const dir = normalizeVector(dx, dy);
    const dot = dir.x * laneDir.x + dir.y * laneDir.y;
    const anglePenalty = 1 - Math.max(-1, Math.min(1, dot));
    const score = anglePenalty * 900 + dist;
    if (dot >= 0.55) {
      if (score < preferredScore) {
        preferredScore = score;
        preferredDir = dir;
      }
    } else if (score < fallbackScore) {
      fallbackScore = score;
      fallbackDir = dir;
    }
  };

  enemies.forEach((enemy) => {
    if (!isEnemyTargetableForAutoAim(enemy)) return;
    const center = getEnemyHitboxCenter(enemy);
    evaluate(center.x, center.y);
  });
  projectiles.forEach((proj) => {
    if (!proj || proj.dead || proj.friendly || proj.visualOnly) return;
    evaluate(proj.x, proj.y);
  });

  return preferredDir || fallbackDir || laneDir;
}

function getCongregationPathCommandTarget(playerEntity = player) {
  if (!playerEntity) return null;
  const pickupCandidates = [];
  const addPickup = (pickup) => {
    if (!pickup || pickup.active === false || pickup.visible === false || pickup.expired) return;
    const dx = (pickup.x || 0) - playerEntity.x;
    const dy = (pickup.y || 0) - playerEntity.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= 0 || dist > 280) return;
    pickupCandidates.push({ x: pickup.x, y: pickup.y, dist });
  };
  utilityPowerUps.forEach(addPickup);
  weaponPickups.forEach(addPickup);
  churchPowerupPickups.forEach(addPickup);
  pickupCandidates.sort((a, b) => a.dist - b.dist);
  if (pickupCandidates.length) {
    return { x: pickupCandidates[0].x, y: pickupCandidates[0].y, pickupBias: true };
  }

  let bestTarget = null;
  let bestScore = Infinity;
  const evaluate = (x, y) => {
    const dx = x - playerEntity.x;
    const dy = y - playerEntity.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= 0 || dist > 320) return;
    const score = dist;
    if (score < bestScore) {
      bestScore = score;
      bestTarget = { x, y, pickupBias: false };
    }
  };
  enemies.forEach((enemy) => {
    if (!isEnemyTargetableForAutoAim(enemy)) return;
    const center = getEnemyHitboxCenter(enemy);
    evaluate(center.x, center.y);
  });
  projectiles.forEach((proj) => {
    if (!proj || proj.dead || proj.friendly || proj.visualOnly) return;
    evaluate(proj.x, proj.y);
  });
  return bestTarget;
}

function getCongregationPathDirectionForNpc(npc, volley, fallbackAim) {
  const targetX = Number.isFinite(volley?.targetX) ? volley.targetX : npc.x + fallbackAim.x * 180;
  const targetY = Number.isFinite(volley?.targetY) ? volley.targetY : npc.y + fallbackAim.y * 180;
  const playerX = Number.isFinite(volley?.playerX) ? volley.playerX : npc.x;
  const playerY = Number.isFinite(volley?.playerY) ? volley.playerY : npc.y;
  const playerToTarget = normalizeVector(targetX - playerX, targetY - playerY);
  const baseCorridorDir =
    playerToTarget.x !== 0 || playerToTarget.y !== 0 ? playerToTarget : fallbackAim;
  const perpDir = { x: -baseCorridorDir.y, y: baseCorridorDir.x };
  const laneSpacing = volley?.pickupBias ? 52 : 34;
  const laneOffset = (Number(volley?.pathSlot) || 0) * laneSpacing;
  const desiredX = targetX + perpDir.x * laneOffset;
  const desiredY = targetY + perpDir.y * laneOffset;
  const corridorDir = normalizeVector(desiredX - npc.x, desiredY - npc.y);
  const laneDir = corridorDir.x !== 0 || corridorDir.y !== 0 ? corridorDir : baseCorridorDir;
  let bestDir = null;
  let bestScore = Infinity;

  const evaluate = (targetEntityX, targetEntityY) => {
    const dx = targetEntityX - npc.x;
    const dy = targetEntityY - npc.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= 0) return;
    const dir = normalizeVector(dx, dy);
    const dot = dir.x * laneDir.x + dir.y * laneDir.y;
    if (dot < 0.15) return;
    const relX = targetEntityX - playerX;
    const relY = targetEntityY - playerY;
    const along = relX * baseCorridorDir.x + relY * baseCorridorDir.y;
    const perp = Math.abs((relX * -baseCorridorDir.y + relY * baseCorridorDir.x) - laneOffset);
    const corridorPenalty = perp * 2.8 + Math.max(0, -along) * 4.5;
    const forwardPenalty = (1 - dot) * 520;
    const score = corridorPenalty + forwardPenalty + dist * 0.3;
    if (score < bestScore) {
      bestScore = score;
      bestDir = dir;
    }
  };

  enemies.forEach((enemy) => {
    if (!isEnemyTargetableForAutoAim(enemy)) return;
    const center = getEnemyHitboxCenter(enemy);
    evaluate(center.x, center.y);
  });
  projectiles.forEach((proj) => {
    if (!proj || proj.dead || proj.friendly || proj.visualOnly) return;
    evaluate(proj.x, proj.y);
  });

  return bestDir || laneDir;
}

function fireCongregationVolleyShot(npc, volley) {
  if (!npc || npc.departed || !npc.active || (npc.faith || 0) <= 0) return false;
  const playerAim = normalizeVector(volley?.aimX || 1, volley?.aimY || 0);
  const clusterCenter = {
    x: Number.isFinite(volley?.clusterCenterX) ? volley.clusterCenterX : npc.x,
    y: Number.isFinite(volley?.clusterCenterY) ? volley.clusterCenterY : npc.y,
  };
  const mode = volley?.mode || "volley";
  const dir =
    mode === "path"
      ? getCongregationPathDirectionForNpc(npc, volley, playerAim)
      : getCongregationVolleyDirectionForNpc(npc, clusterCenter, playerAim);
  if (!dir || (!dir.x && !dir.y)) return false;
  const originOffset = (npc.radius || 24) * 0.72;
  const originX = npc.x + dir.x * originOffset;
  const originY = npc.y + dir.y * originOffset;
  const baseSpeed = PROJECTILE_CONFIG.fire?.speed || 420;
  const travel = distanceToEdge(originX, originY, dir.x, dir.y);
  const speed = baseSpeed * CONGREGATION_COMMAND_SPEED_MULTIPLIER;
  const life = travel / Math.max(1, speed);
  const fireFrames = assets?.projectiles?.fire?.frames || null;
  spawnProjectile("fire", originX, originY, dir.x, dir.y, {
    friendly: true,
    damage: CONGREGATION_COMMAND_DAMAGE,
    speed,
    life,
    pierce: true,
    frames: fireFrames,
    frameDuration: 0.05,
    flipHorizontal: dir.x < 0,
    source: npc,
    scale: CONGREGATION_COMMAND_SCALE,
  });
  npc.projectileGlowTimer = Math.max(npc.projectileGlowTimer || 0, 0.2);
  if (npc.animator) {
    if (typeof npc.animator.setState === "function") {
      npc.animator.setState("attack", { restart: true });
      if (typeof npc.animator.setMoving === "function") {
        npc.animator.setMoving(false);
      }
    } else if (typeof npc.animator.play === "function") {
      npc.animator.play("attack", { restart: true });
    }
  }
  npc.npcArrowCooldown = Math.max(npc.npcArrowCooldown || 0, 0.35);
  spawnFlashEffect(originX, originY);
  return true;
}

function triggerCongregationCommand(playerEntity = player, options = {}) {
  if (!playerEntity || playerEntity.state === "death") return false;
  const mode = options?.mode === "path" ? "path" : "volley";
  const activeNpcs = npcs.filter(
    (npc) => npc && npc.active && !npc.departed && (npc.faith || 0) > 0,
  );
  if (!activeNpcs.length) return false;

  const hostilesExist =
    enemies.some((enemy) => enemy && !enemy.dead && enemy.state !== "death") ||
    projectiles.some((proj) => proj && !proj.dead && !proj.friendly && !proj.visualOnly);
  const isTutorial = typeof window !== "undefined" && window.__congregationTutorialActive;
  if (!hostilesExist && !isTutorial) return false;

  const playerAim =
    typeof playerEntity.getAimDirection === "function"
      ? playerEntity.getAimDirection()
      : normalizeVector(playerEntity.aim?.x || 1, playerEntity.aim?.y || 0);

  const clusterCenter = activeNpcs.reduce(
    (acc, npc) => {
      acc.x += npc.x || 0;
      acc.y += npc.y || 0;
      return acc;
    },
    { x: 0, y: 0 },
  );
  clusterCenter.x /= Math.max(1, activeNpcs.length);
  clusterCenter.y /= Math.max(1, activeNpcs.length);
  const aimAngle = Math.atan2(playerAim.y, playerAim.x);
  const pathTarget = mode === "path" ? getCongregationPathCommandTarget(playerEntity) : null;
  const sortedNpcs = [...activeNpcs].sort((a, b) => {
    const angleA = Math.atan2((a.y || 0) - clusterCenter.y, (a.x || 0) - clusterCenter.x);
    const angleB = Math.atan2((b.y || 0) - clusterCenter.y, (b.x || 0) - clusterCenter.x);
    const deltaA = Math.abs(Math.atan2(Math.sin(angleA - aimAngle), Math.cos(angleA - aimAngle)));
    const deltaB = Math.abs(Math.atan2(Math.sin(angleB - aimAngle), Math.cos(angleB - aimAngle)));
    return deltaA - deltaB;
  });

  const tutorialVolleyNpcs = (isTutorial && mode === "volley") ? sortedNpcs.slice(0, 5) : sortedNpcs;
  const tutorialBaseAngle = Math.random() * Math.PI * 2;
  tutorialVolleyNpcs.forEach((npc, index) => {
    const count = tutorialVolleyNpcs.length;
    const tutorialAimX = (isTutorial && mode === "volley")
      ? Math.cos(tutorialBaseAngle + (index / count) * Math.PI * 2)
      : playerAim.x;
    const tutorialAimY = (isTutorial && mode === "volley")
      ? Math.sin(tutorialBaseAngle + (index / count) * Math.PI * 2)
      : playerAim.y;
    npc.pendingCongregationVolley = {
      delay: index * CONGREGATION_COMMAND_STAGGER,
      mode,
      pathSlot: index - (sortedNpcs.length - 1) * 0.5,
      clusterCenterX: clusterCenter.x,
      clusterCenterY: clusterCenter.y,
      aimX: tutorialAimX,
      aimY: tutorialAimY,
      playerX: playerEntity.x,
      playerY: playerEntity.y,
      targetX: pathTarget?.x,
      targetY: pathTarget?.y,
      pickupBias: Boolean(pathTarget?.pickupBias),
    };
  });

  if (typeof playFireballCastSfx === "function") {
    playFireballCastSfx(0.7);
  }
  applyCameraShake(CONGREGATION_COMMAND_SHAKE_DURATION, CONGREGATION_COMMAND_SHAKE_MAGNITUDE);
  return true;
}

if (typeof window !== "undefined") {
  window.triggerCongregationCommand = triggerCongregationCommand;
}

function handleDeveloperHotkeys() {
  if (typeof window !== "undefined" && window.__BC_ENEMY_EDITOR_ACTIVE) {
    keysJustPressed.clear();
    return;
  }
  if (!keysJustPressed.size) return;
  const modifiers = typeof Input !== "undefined" ? Input.modifiers : null;
  const pressed = typeof Input !== "undefined" ? Input.keysPressed : null;
  const shiftHeld = Boolean(modifiers?.shift || pressed?.has?.("Shift"));
  if (!shiftHeld) return;
  if (keysJustPressed.has("1")) {
    devTools.godMode = !devTools.godMode;
    setDevStatus(devTools.godMode ? "God mode enabled" : "God mode disabled", 2.5);
  }
  if (keysJustPressed.has("2")) {
    devClearOpponents({ includeBoss: true });
    setDevStatus("All hostiles eliminated", 2.0);
  }
  if (keysJustPressed.has("3")) {
    if (levelManager?.devSkipWave?.()) {
      setDevStatus("Battle skipped", 2.0);
    }
  }
  if (keysJustPressed.has("5")) {
    const result = levelManager?.devSkipToBoss?.({ showExterior: false });
    if (result?.success) {
      const currentLevel = levelManager?.getLevelNumber ? levelManager.getLevelNumber() : 1;
      setDevStatus(`Battle ${currentLevel} boss engaged`, 2.3);
    } else {
      setDevStatus("Battle boss skip failed", 2.0);
    }
  }
  if (keysJustPressed.has("6")) {
    if (!levelManager?.isActive?.()) {
      setDevStatus("Act 3 Battle 3 boss skip failed (level inactive)", 2.0);
    } else {
      if (levelManager?.devSkipToTownFinalBoss?.({ showExterior: false })?.success) {
        setDevStatus("Act 3 Battle 3 boss engaged", 2.4);
      } else {
        setDevStatus("Act 3 Battle 3 boss skip failed", 2.0);
      }
    }
  }
  if (keysJustPressed.has("7")) {
    if (typeof window !== "undefined" && typeof window.MapScreen?.devUnlockAllTowns === "function") {
      const ok = window.MapScreen.devUnlockAllTowns();
      setDevStatus(ok ? "All 9 towns unlocked (dev)" : "Town unlock failed", 2.5);
    }
  }
  if (keysJustPressed.has("t")) {
    if (typeof window !== "undefined" && typeof window.MapScreen?.devAwardNextTown === "function") {
      void (async () => {
        const result = await window.MapScreen.devAwardNextTown({
          congregationCount: 100,
          campaign: "p1",
          churchPowerupLevels: Object.fromEntries(churchPowerupLevels),
        });
        if (result?.awardedTownName) {
          setDevStatus(`Awarded town: ${result.awardedTownName}`, 2.3);
        } else {
          setDevStatus("No eligible town to award", 2.0);
        }
      })();
    }
  }
  if (keysJustPressed.has("y")) {
    speedrunTimer.visible = !speedrunTimer.visible;
    setDevStatus(speedrunTimer.visible ? "Timer shown" : "Timer hidden", 2.0);
  }
  if (keysJustPressed.has("c")) {
    adjustCongregationSize(5);
    setDevStatus("Congregation +5", 2.0);
  }
  if (keysJustPressed.has("9")) {
    if (levelManager?.devSkipToGraceRush?.()) {
      setDevStatus("Grace rush engaged", 2.0);
    }
  }
  if (keysJustPressed.has("o")) {
    if (typeof Input?.setVirtualControlsVisible === "function") {
      const nextEnabled = !Input.virtualInput?.enabled;
      Input.setVirtualControlsVisible(nextEnabled);
      setDevStatus(`Touch controls ${nextEnabled ? "ON" : "OFF"}`, 1.4);
    }
  }
  if (keysJustPressed.has("p")) {
    if (devSwapPowerups()) {
      setDevStatus("Powerups swapped", 1.6);
    }
  }
  if (keysJustPressed.has("b")) {
    if (player && typeof player.addPrayerCharge === "function") {
      const required = Math.max(1, player.prayerChargeRequired || PRAYER_BOMB_CHARGE_REQUIRED || 60);
      const ratio = Math.max(0, Math.min(1, (player.prayerCharge || 0) / required));
      let targetRatio = PRAYER_BOMB_LEVEL1_THRESHOLD || 0.5;
      if (ratio >= (PRAYER_BOMB_LEVEL1_THRESHOLD || 0.5) && ratio < (PRAYER_BOMB_LEVEL2_THRESHOLD || 0.8)) {
        targetRatio = PRAYER_BOMB_LEVEL2_THRESHOLD || 0.8;
      } else if (ratio >= (PRAYER_BOMB_LEVEL2_THRESHOLD || 0.8)) {
        targetRatio = PRAYER_BOMB_LEVEL3_THRESHOLD || 1.0;
      }
      player.prayerCharge = Math.min(required, Math.max(0, Math.round(required * targetRatio)));
      const levelLabel = targetRatio >= (PRAYER_BOMB_LEVEL3_THRESHOLD || 1.0)
        ? "Prayer bomb maxed"
        : targetRatio >= (PRAYER_BOMB_LEVEL2_THRESHOLD || 0.8)
        ? "Prayer bomb level 2"
        : "Prayer bomb level 1";
      setDevStatus(levelLabel, 2.0);
    }
  }
  if (keysJustPressed.has("4")) {
    if (levelManager?.devSkipLevel?.()) {
      setDevStatus("Level skipped", 2.5);
    }
  }
  if (keysJustPressed.has("v")) {
    if (visitorSession.active) {
      completeVisitorSession("devCancel");
      setDevStatus("Visitor session cancelled", 1.6);
    } else if (beginVisitorSession({ autoTriggered: false })) {
      setDevStatus("Visitor session started (dev)", 1.8);
    }
  }
  if (keysJustPressed.has("s")) {
    // show overrides hotkey pressed (silenced)
  }
}

function isAnyDialogActive() {
  return Boolean(
    window.DialogOverlay?.isVisible?.() ||
    window.UpgradeScreen?.isVisible?.()
  );
}

function updateDebugSystems(dt) {
  if (DEBUG && debugOverlayVisible) {
    debugOverlayUpdateAccumulator += dt;
    if (debugOverlayUpdateAccumulator >= DEBUG_OVERLAY_UPDATE_INTERVAL) {
      debugOverlayUpdateAccumulator = 0;
      updateDebugOverlayData();
    }
  }
}

function updateTownIntroTransition(dt) {
  if (!townIntroTransitionActive) return false;

  townIntroTransitionTimer = Math.min(
    TOWN_INTRO_ZOOM_DURATION + TOWN_INTRO_FADE_DURATION,
    townIntroTransitionTimer + dt,
  );
  if (wasActionJustPressed("pause") || wasActionJustPressed("restart")) {
    townIntroTransitionTimer = TOWN_INTRO_ZOOM_DURATION + TOWN_INTRO_FADE_DURATION;
  }
  if (townIntroTransitionTimer >= TOWN_INTRO_ZOOM_DURATION + TOWN_INTRO_FADE_DURATION) {
    townIntroTransitionActive = false;
    // Check if we need to trigger boss intro after exterior shot (dev hotkey 5)
    if (pendingBossIntroAfterExterior) {
      pendingBossIntroAfterExterior = false;
      if (levelManager?.triggerBossIntro) {
        levelManager.triggerBossIntro();
      }
    }
  }
  try {
    const status = levelManager?.getStatus ? levelManager.getStatus() : null;
    if (status?.stage === "levelIntro") {
      if (!powerUpsClearedForCongregation) {
        clearAllPowerUps();
        powerUpsClearedForCongregation = true;
      }
      updateCongregationMembers(dt);
      resolveCongregationMemberCollisions();
      updatePlayerDuringCongregation(dt);
      resolveCongregationCollisions();
    }
  } catch (e) {}
  keysJustPressed.delete(" ");
  keysJustPressed.delete("pause");
  keysJustPressed.delete("restart");
  return true;
}

function updateDeathFadeEffects(dt) {
  if (player) {
    const target = player.state === "death" ? PLAYER_DEATH_FADE_TARGET : 0;
    const step = Math.min(1, dt * PLAYER_DEATH_FADE_SPEED);
    playerDeathFadeAlpha += (target - playerDeathFadeAlpha) * step;
    if (Math.abs(playerDeathFadeAlpha - target) < 0.01) {
      playerDeathFadeAlpha = target;
    }
  }
}

function updateDeathBellAudio(dt) {
  if (playerDeathBellFadeTimer > 0 && playerDeathBellAudio) {
    playerDeathBellFadeTimer = Math.max(0, playerDeathBellFadeTimer - dt);
    if (playerDeathBellFadeTimer <= PLAYER_DEATH_BELL_FADE_DURATION) {
      const t = playerDeathBellFadeTimer / Math.max(0.001, PLAYER_DEATH_BELL_FADE_DURATION);
      playerDeathBellAudio.volume = Math.max(0, Math.min(1, playerDeathBellFadeVolume * t));
      if (playerDeathBellFadeTimer <= 0.001) {
        try {
          playerDeathBellAudio.pause();
          playerDeathBellAudio.currentTime = 0;
        } catch (err) {}
        if (playerDeathBellResume) {
          if (playerDeathBellResume.intro && musicState.intro) {
            playMusic(musicState.intro, { volume: MUSIC_VOLUME_INTRO, loop: false });
          }
          if (playerDeathBellResume.battle) {
            const activeBattleAudio = getCurrentBattleAudio();
            if (activeBattleAudio) {
              playMusic(activeBattleAudio, { volume: MUSIC_VOLUME_BATTLE, loop: true });
            }
          }
          if (playerDeathBellResume.recap && musicState.recap) {
            playMusic(musicState.recap, { volume: MUSIC_VOLUME_BATTLE, loop: false });
          }
          playerDeathBellResume = null;
        }
        playerDeathBellActive = false;
      }
    }
  }
}

function showChapterBreak(actNumber) {
  console.log("showChapterBreak called with actNumber:", actNumber);
  chapterBreakActive = true;
  chapterBreakActNumber = actNumber;
  chapterBreakImage = actNumber === 2 ? assets?.backgrounds?.act2 : assets?.backgrounds?.act3;
  console.log("chapterBreakActive set to true, image:", chapterBreakImage ? "loaded" : "null");
  keysJustPressed.delete(" ");
}

function handleChapterBreak() {
  if (!chapterBreakActive) return false;

  const buttons =
    typeof window !== "undefined" && window.__announcementButtons?.key === "chapterBreak"
      ? window.__announcementButtons.buttons
      : null;
  const handled = handleAnnouncementButtons({
    key: "chapterBreak",
    buttons,
    allowSpace: true,
    onActivate: () => {
      chapterBreakActive = false;
      chapterBreakImage = null;
      if (typeof window !== "undefined" && typeof window.playMenuAdvanceSfx === "function") {
        window.playMenuAdvanceSfx(0.55);
      }
      // Clear any mission brief announcements that were queued while chapter break was showing
      // The exterior shot should come before the mission brief
      while (levelAnnouncements.length && levelAnnouncements[0].missionBriefTitle) {
        levelAnnouncements.shift();
      }
      // Queue exterior shot for the next Order's first mission
      queueExteriorShotAnnouncement();
    },
  });
  if (handled) return false;

  // Check for space press to dismiss immediately
  if (wasActionJustPressed("pause") || wasActionJustPressed("restart")) {
    chapterBreakActive = false;
    chapterBreakImage = null;
    if (typeof window !== "undefined" && typeof window.playMenuAdvanceSfx === "function") {
      window.playMenuAdvanceSfx(0.55);
    }
    // Clear any mission brief announcements that were queued while chapter break was showing
    // The exterior shot should come before the mission brief
    while (levelAnnouncements.length && levelAnnouncements[0].missionBriefTitle) {
      levelAnnouncements.shift();
    }
    // Queue exterior shot for the next Order's first mission
    queueExteriorShotAnnouncement();
    keysJustPressed.delete(" ");
    console.log("Chapter break dismissed by user");
    return false;
  }

  // Continue blocking game loop while chapter break is active
  return true;
}

function checkDialogOverlays() {
  if (window.DialogOverlay?.consumeAction?.() || window.UpgradeScreen?.consumeAction?.()) {
    keysJustPressed.delete(" ");
    keysJustPressed.delete("pause");
    keysJustPressed.delete("restart");
    keysJustPressed.delete("ArrowDown");
    return true;
  }
  if (isAnyDialogActive()) {
    keysJustPressed.delete(" ");
    keysJustPressed.delete("ArrowDown");
    return true;
  }
  if (pendingUpgradeAfterSummary && window.UpgradeScreen && !window.UpgradeScreen.isVisible()) {
    clearGracePickups();
    clearAllPowerUps();
    Effects.clear();

    // Check if this is final town level - show pastor post-recap after upgrade
    if (pendingPastorPostRecapAfterUpgrade) {
      console.log("FINAL TOWN LEVEL - showing upgrade then pastor post-recap");
      const targetLevel = lastCompletedLevel || levelManager?.getLevelNumber?.() || 1;
      window.UpgradeScreen.show(() => {
        queuePastorBossPostRecapAnnouncement(targetLevel, false);
      });
      pendingPastorPostRecapAfterUpgrade = false;
    // Check if we need to show chapter break after upgrade
    // lastCompletedLevel was set when the battle summary showed
    // Show chapter break after level 1 (month 4) and level 2 (month 8)
    // Level 1 complete → Mission 2, Level 2 complete → Mission 3
    } else if (lastSummaryWasLevelEnd && (lastCompletedLevel === 1 || lastCompletedLevel === 2)) {
      const actNumber = lastCompletedLevel + 1; // Level 1 done → Mission 2, Level 2 done → Mission 3
      console.log("SHOWING CHAPTER BREAK for Mission", actNumber);
      window.UpgradeScreen.show(() => {
        console.log("UPGRADE SCREEN CLOSED, calling showChapterBreak");
        if (lastCompletedLevel === 2 && !townVisitorMinigamePlayed) {
          townVisitorMinigamePlayed = true;
          if (levelManager?.triggerVisitorMinigame) {
            const started = levelManager.triggerVisitorMinigame(() => {
              showChapterBreak(actNumber);
            });
            if (started) return;
          }
        }
        showChapterBreak(actNumber);
      });
    } else {
      console.log("NO CHAPTER BREAK - lastCompletedLevel is", lastCompletedLevel);
      window.UpgradeScreen.show(() => {
        queueExteriorShotAnnouncement();
      });
    }

    pendingUpgradeAfterSummary = false;
    lastSummaryWasLevelEnd = false;
    keysJustPressed.delete(" ");
    return true;
  }
  return false;
}

function updatePostDeathSequence(dt) {
  if (postDeathSequenceActive) {
    postDeathTimer = Math.max(0, postDeathTimer - dt);
    if (postDeathTimer <= 0 && !miniImpWaveDispatched) {
      console.log("Death hang complete, spawning mini-imp swarms");
      triggerPostDeathMiniSwarm();
      miniImpWaveDispatched = true;
      arenaFadeTimer = ARENA_FADE_DURATION;
      arenaFadeAlpha = 0;
    }
    if (miniImpWaveDispatched && arenaFadeTimer >= 0) {
      arenaFadeTimer = Math.max(0, arenaFadeTimer - dt);
      const progress = Math.min(1, Math.max(0, 1 - arenaFadeTimer / ARENA_FADE_DURATION));
      arenaFadeAlpha = progress;
      if (arenaFadeTimer <= 0) {
        arenaFadeAlpha = 1;
        postDeathSequenceActive = false;
        gameOver = true;
        window.shouldShowGameOverMessage = true;
        window.gameOverReady = true;
        damageHitFlash = 0;
        console.log("Arena fade complete, gameOver ready");
        showGameOverDialog();
      }
    }
  } else {
    arenaFadeAlpha = 0;
  }
}

function updateFadeEffects(dt) {
  if (actBreakFadeTimer > 0) {
    actBreakFadeTimer = Math.max(0, actBreakFadeTimer - dt);
    const elapsed = actBreakFadeDuration - actBreakFadeTimer;
    const fadeIn = Math.min(actBreakFadeDuration, ACT_BREAK_FADE_IN);
    const fadeOut = Math.min(actBreakFadeDuration, ACT_BREAK_FADE_OUT);
    if (elapsed < fadeIn) {
      actBreakFadeAlpha = fadeIn > 0 ? Math.min(1, elapsed / fadeIn) : 1;
    } else if (actBreakFadeTimer <= fadeOut) {
      actBreakFadeAlpha = fadeOut > 0 ? Math.min(1, actBreakFadeTimer / fadeOut) : 0;
    } else {
      actBreakFadeAlpha = 1;
    }
  } else {
    actBreakFadeAlpha = 0;
  }

  if (graceRushFadeTimer > 0) {
    graceRushFadeTimer = Math.max(0, graceRushFadeTimer - dt);
    const progress = Math.min(1, Math.max(0, 1 - graceRushFadeTimer / graceRushFadeDuration));
    graceRushFadeAlpha = Math.max(0, Math.min(1, progress));
    if (graceRushFadeTimer <= 0) {
      graceRushFadeHold = true;
      graceRushFadeAlpha = 1;
      graceRushBlackout = true;
    }
  } else if (graceRushFadeHold) {
    graceRushFadeAlpha = 1;
  } else {
    graceRushFadeAlpha = 0;
  }

  const hardBlackoutActive = graceRushHardBlackoutTimer > 0 || graceRushBlackout;
  if (hardBlackoutActive) {
    if (graceRushHardBlackoutTimer > 0) {
      graceRushHardBlackoutTimer = Math.max(0, graceRushHardBlackoutTimer - dt);
    }
    try {
      Effects.clear();
      floatingTexts.forEach((ft) => {
        if (!ft.critical) ft.life = 0;
      });
    } catch (e) {}
  }

  if (bossBonusTransitionFadeTimer > 0) {
    bossBonusTransitionFadeTimer = Math.max(0, bossBonusTransitionFadeTimer - dt);
    const progress = Math.min(
      1,
      Math.max(
        0,
        1 - bossBonusTransitionFadeTimer / Math.max(0.001, bossBonusTransitionFadeDuration),
      ),
    );
    bossBonusTransitionFadeAlpha = progress;
  } else {
    bossBonusTransitionFadeAlpha = 0;
  }

  if (recapIntroFadeTimer > 0) {
    recapIntroFadeTimer = Math.max(0, recapIntroFadeTimer - dt);
    recapIntroFadeAlpha = Math.min(
      1,
      Math.max(0, recapIntroFadeTimer / Math.max(0.001, recapIntroFadeDuration)),
    );
  } else {
    recapIntroFadeAlpha = 0;
  }
}

function updateSpeedrunTimer(levelStatus) {
  if (!speedrunTimer.running) return;
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  const currentSection = getSpeedrunSectionName(levelStatus);
  if (speedrunTimer.startTime == null) {
    speedrunTimer.startTime = now;
    speedrunTimer.sectionStart = now;
    speedrunTimer.currentSection = currentSection;
    speedrunTimer.splits = [];
  } else if (speedrunTimer.currentSection !== currentSection && currentSection) {
    const duration = Math.max(0, now - (speedrunTimer.sectionStart || now));
    speedrunTimer.splits.push({ name: speedrunTimer.currentSection, duration });
    speedrunTimer.sectionStart = now;
    speedrunTimer.currentSection = currentSection;
  }
  if (speedrunTimer.startTime != null) {
    speedrunTimer.totalElapsed = Math.max(0, now - speedrunTimer.startTime);
    speedrunTimer.sectionElapsed = Math.max(0, now - (speedrunTimer.sectionStart || now));
  }
}

function updateMusicState(levelStatus) {
  const stage = levelStatus?.stage;
  const desiredBattleTrack = getDesiredBattleTrack(levelStatus);
  if (playerDeathBellActive) {
    pauseAllMusic();
    return;
  }
  if (visitorSession?.active) {
    if (musicState.battleStarted && !musicState.battleStopped) {
      fadeOutBattleMusic();
    }
    if (musicState.introStarted && !musicState.introStopped) {
      stopIntroMusic();
    }
    if (musicState.recapStarted && !musicState.recapStopped) {
      stopRecapMusic();
    }
    startVisitorMusic();
    return;
  }
  const battleShouldPlay =
    stage === "npcArrival" ||
    stage === "battleIntro" ||
    stage === "waveIntro" ||
    stage === "waveActive" ||
    stage === "allKillBreak" ||
    stage === "waveCleared" ||
    stage === "bossIntro" ||
    stage === "bossActive" ||
    musicState.battlePrimed;
  if (battleShouldPlay && formationState?.current) {
    if (stage && stage !== "briefing") {
      musicState.battlePrimed = false;
    }
    if (musicState.recapStarted && !musicState.recapStopped) stopRecapMusic();
    if (musicState.visitorStarted && !musicState.visitorStopped) stopVisitorMusic();
    if (musicState.introStarted && !musicState.introStopped) stopIntroMusic();
    if (musicState.unlocked) {
      startBattleMusic(desiredBattleTrack);
    }
  } else if (musicState.battleStarted && !musicState.battleStopped) {
    fadeOutBattleMusic();
  }
  if (
    stage === "levelIntro" ||
    stage === "briefing" ||
    stage === "npcArrival"
  ) {
    if (musicState.exteriorStarted || musicState.exteriorBossStarted) stopExteriorMusic();
    if (musicState.recapStarted && !musicState.recapStopped) stopRecapMusic();
    if (musicState.visitorStarted && !musicState.visitorStopped) stopVisitorMusic();
  }
}

function updateGraceRushFadeRelease(dt) {
  if (!graceRushFadeHold) return;
  if (window.DialogOverlay?.isVisible?.()) {
    if (graceRushFadeReleaseTimer <= 0) {
      graceRushFadeReleaseTimer = 0.2;
    }
    graceRushFadeReleaseTimer = Math.max(0, graceRushFadeReleaseTimer - dt);
    if (graceRushFadeReleaseTimer <= 0) {
      graceRushFadeHold = false;
      graceRushFadeDuration = 0;
      graceRushFadeAlpha = 0;
    }
  }
}

function updateLevelManagement() {
  const currentLevelNumber = levelManager?.getLevelNumber ? levelManager.getLevelNumber() : 1;
  if (lastLevelNumber === null) lastLevelNumber = currentLevelNumber;
  if (currentLevelNumber !== lastLevelNumber) {
    Spawner.resetLevelFlags(currentLevelNumber);
    lastLevelNumber = currentLevelNumber;
  }
}

function updatePlayerRespawn(dt) {
  if (!playerRespawnPending) return false;
  respawnTimer = Math.max(0, respawnTimer - dt);
  respawnIndicatorTimer -= dt;
  if (player && respawnIndicatorTimer <= 0) {
    addStatusText(player, "Exhausted", {
      color: "#FF6B6B",
      bgColor: "rgba(60, 20, 20, 0.88)",
      life: Math.min(0.6, RESPAWN_STATUS_INTERVAL),
      offsetY: player.radius + 34,
    });
    respawnIndicatorTimer = RESPAWN_STATUS_INTERVAL;
  }
  if (respawnTimer <= 0) {
    const oldPlayer = player;
    const respawnX = canvas.width / 2;
    const respawnY = HUD_HEIGHT + 40;
    player = createPlayerInstance(respawnX, respawnY, assets.player);
    player.x = respawnX;
    const respawnTop = HUD_HEIGHT + Math.max(player.radius + 16, 28);
    player.y = Math.max(respawnTop, respawnY);
    player.shieldTimer = 0;
    player.invulnerableTimer = RESPAWN_SHIELD_DURATION;
    player.health = player.maxHealth;
    player.state = "idle";
    playerRespawnPending = false;
    respawnIndicatorTimer = 0;
    floatingTexts.forEach((ft) => {
      if (ft.entity === oldPlayer && !ft.critical) ft.life = 0;
    });
  }
  return true;
}

function showSettingsOverlay({ source = "title" } = {}) {
  if (!window.DialogOverlay) return;
  const bodyHtml = `
    <div class="settings-panel">
      <div class="settings-row">
        <div class="settings-row__label">Music</div>
        <label class="settings-toggle">
          <input type="checkbox" data-setting="musicEnabled">
          <span>On</span>
        </label>
      </div>
      <div class="settings-row settings-row--slider">
        <label class="settings-row__label" for="settingsMusicVolume">Music Volume</label>
        <div class="settings-slider">
          <input type="range" id="settingsMusicVolume" min="0" max="100" value="100" step="1" data-setting="musicVolume">
          <span class="settings-slider__value" data-setting-value="musicVolume">100%</span>
        </div>
      </div>
      <div class="settings-row">
        <div class="settings-row__label">Sound Effects</div>
        <label class="settings-toggle">
          <input type="checkbox" data-setting="sfxEnabled">
          <span>On</span>
        </label>
      </div>
      <div class="settings-row settings-row--slider">
        <label class="settings-row__label" for="settingsSfxVolume">SFX Volume</label>
        <div class="settings-slider">
          <input type="range" id="settingsSfxVolume" min="0" max="100" value="100" step="1" data-setting="sfxVolume">
          <span class="settings-slider__value" data-setting-value="sfxVolume">100%</span>
        </div>
      </div>
    </div>
  `;
  window.DialogOverlay.show({
    title: "Settings",
    bodyHtml,
    buttonText: "Back",
    variant: "settings",
    onRender: ({ bodyEl, overlay }) => {
      if (!bodyEl) return;
      const setSliderValue = (key, value) => {
        const valueEl = bodyEl.querySelector(`[data-setting-value="${key}"]`);
        if (valueEl) valueEl.textContent = `${Math.round(value * 100)}%`;
      };
      if (overlay) {
        overlay.classList.remove("dialog-overlay--panel-default");
        const setOverlayCssVar = (key, value) => {
          if (value === null || value === undefined || value === "") {
            overlay.style.removeProperty(key);
            return;
          }
          overlay.style.setProperty(key, String(value));
        };
        if (source === "title") {
          overlay.classList.add("dialog-overlay--panel-default");
          const defaultPanelStyle = window.UIStyles?.panels?.hellfire?.default || {};
          const widthMax = Number(defaultPanelStyle.panelWidthMax);
          const widthRatio = Number(defaultPanelStyle.panelWidthRatio);
          setOverlayCssVar(
            "--hellfire-default-panel-width-max",
            Number.isFinite(widthMax) ? `${widthMax}px` : null,
          );
          setOverlayCssVar(
            "--hellfire-default-panel-width-ratio",
            Number.isFinite(widthRatio) ? `${Math.round(widthRatio * 100)}%` : null,
          );
          setOverlayCssVar(
            "--hellfire-default-title-transform",
            defaultPanelStyle.titleTextTransform || null,
          );
          setOverlayCssVar(
            "--hellfire-default-title-align",
            defaultPanelStyle.titleAlign || null,
          );
          setOverlayCssVar(
            "--hellfire-default-title-color",
            defaultPanelStyle.titleColor || null,
          );
          setOverlayCssVar(
            "--hellfire-default-title-size",
            Number.isFinite(defaultPanelStyle.titleFontSize) ? `${defaultPanelStyle.titleFontSize}px` : null,
          );
          setOverlayCssVar(
            "--hellfire-default-divider-inset-x",
            Number.isFinite(defaultPanelStyle.dividerInsetX) ? `${Math.max(0, defaultPanelStyle.dividerInsetX)}px` : null,
          );
          const dividerMarginTop = Number(defaultPanelStyle.dividerY) - 56;
          setOverlayCssVar(
            "--hellfire-default-divider-margin-top",
            Number.isFinite(dividerMarginTop) ? `${Math.max(0, dividerMarginTop)}px` : null,
          );
        } else {
          setOverlayCssVar("--hellfire-default-panel-width-max", null);
          setOverlayCssVar("--hellfire-default-panel-width-ratio", null);
          setOverlayCssVar("--hellfire-default-title-transform", null);
          setOverlayCssVar("--hellfire-default-title-align", null);
          setOverlayCssVar("--hellfire-default-title-color", null);
          setOverlayCssVar("--hellfire-default-title-size", null);
          setOverlayCssVar("--hellfire-default-divider-inset-x", null);
          setOverlayCssVar("--hellfire-default-divider-margin-top", null);
        }
        let footerHint = overlay.querySelector(".dialog-overlay__footer-hint");
        if (!footerHint) {
          footerHint = document.createElement("div");
          footerHint.className = "dialog-overlay__footer-hint";
          overlay.appendChild(footerHint);
        }
        const controlsHint =
          typeof window.Renderer?.getControlsHintText === "function"
            ? window.Renderer.getControlsHintText()
            : "Keyboard: Navigation/Movement: WASD | Action Buttons: Left, Down, Right | Select: Space | Back: Esc";
        footerHint.textContent = controlsHint;
      }
      const musicToggle = bodyEl.querySelector('[data-setting="musicEnabled"]');
      const musicSlider = bodyEl.querySelector('[data-setting="musicVolume"]');
      const sfxToggle = bodyEl.querySelector('[data-setting="sfxEnabled"]');
      const sfxSlider = bodyEl.querySelector('[data-setting="sfxVolume"]');
      if (musicToggle) musicToggle.checked = Boolean(audioSettings.musicEnabled);
      if (musicSlider) musicSlider.value = String(Math.round(audioSettings.musicVolume * 100));
      if (sfxToggle) sfxToggle.checked = Boolean(audioSettings.sfxEnabled);
      if (sfxSlider) sfxSlider.value = String(Math.round(audioSettings.sfxVolume * 100));
      setSliderValue("musicVolume", audioSettings.musicVolume);
      setSliderValue("sfxVolume", audioSettings.sfxVolume);

      const updateSetting = (key, value) => {
        audioSettings[key] = value;
        saveAudioSettings();
        applyAudioSettings();
      };

      if (musicToggle) {
        musicToggle.addEventListener("change", (event) => {
          updateSetting("musicEnabled", event.target.checked);
        });
      }
      if (musicSlider) {
        musicSlider.addEventListener("input", (event) => {
          const next = clamp01(Number(event.target.value) / 100);
          setSliderValue("musicVolume", next);
          updateSetting("musicVolume", next);
        });
      }
      if (sfxToggle) {
        sfxToggle.addEventListener("change", (event) => {
          updateSetting("sfxEnabled", event.target.checked);
        });
      }
      if (sfxSlider) {
        sfxSlider.addEventListener("input", (event) => {
          const next = clamp01(Number(event.target.value) / 100);
          setSliderValue("sfxVolume", next);
          updateSetting("sfxVolume", next);
        });
      }
    },
    onContinue: () => {
      if (source === "pause") {
        window.isPauseOverlayActive = true;
      }
    },
  });
}

function isDeveloperToolActive() {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (window.__battlechurchHitboxEditorActive) return true;
  if (window.__BC_ENEMY_EDITOR_ACTIVE) return true;
  const levelBuilderOverlay = document.getElementById("levelBuilderOverlay");
  return Boolean(levelBuilderOverlay && levelBuilderOverlay.style.display === "block");
}

function showDeveloperShortcutsOverlay() {
  if (!window.DialogOverlay) return;
  const shortcutCards = [
    { key: "1", label: "God Mode" },
    { key: "2", label: "Clear Hostiles" },
    { key: "3", label: "Skip Battle" },
    { key: "4", label: "Skip Level" },
    { key: "5", label: "Current Battle Boss" },
    { key: "6", label: "Act 3 Battle 3 Boss (current town)" },
    { key: "7", label: "Unlock All Towns (Map)" },
    { key: "9", label: "Grace Rush" },
    { key: "T", label: "Award Next Town" },
    { key: "Y", label: "Toggle Timer" },
    { key: "C", label: "+5 Congregation" },
    { key: "O", label: "Touch Controls" },
    { key: "P", label: "Swap Powerups" },
    { key: "B", label: "Prayer Bomb Charge" },
    { key: "V", label: "Visitor Session" },
    { key: "M", label: "Debug Overlay" },
    { key: "G", label: "+500 Grace" },
    { key: "H", label: "Hitbox Editor", note: "Title Only" },
  ];
  const bodyHtml = `
    <div class="settings-panel settings-panel--dev-shortcuts">
      <div class="dev-shortcuts-hint">Press Shift</div>
      <div class="dev-shortcuts-grid">
        ${shortcutCards
          .map(
            ({ key, label, note }) => `
              <div class="dev-shortcut-card">
                <div class="dev-shortcut-card__key">${key}</div>
                <div class="dev-shortcut-card__label">${label}</div>
                ${note ? `<div class="dev-shortcut-card__note">${note}</div>` : ""}
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
  window.DialogOverlay.show({
    title: "Developer Shortcuts",
    bodyHtml,
    buttonText: "Back",
    variant: "settings",
    onContinue: () => {
      showDeveloperOverlay();
    },
  });
}

function showDeveloperOverlay() {
  if (!window.DialogOverlay) return;
  const bodyHtml = `
    <div class="settings-panel settings-panel--developer">
      <div class="dev-action-grid">
        <button class="dialog-overlay__button dev-action-grid__button" data-dev-action="enemy">Enemy Editor</button>
        <button class="dialog-overlay__button dev-action-grid__button" data-dev-action="level">Level Editor</button>
        <button class="dialog-overlay__button dev-action-grid__button" data-dev-action="hitbox">Hitbox Editor</button>
        <button class="dialog-overlay__button dev-action-grid__button" data-dev-action="bossHitbox">Boss Hitbox Editor</button>
        <button class="dialog-overlay__button dev-action-grid__button" data-dev-action="shortcuts">Developer Shortcuts</button>
      </div>
      <div class="settings-row"><div class="settings-row__label"><strong>Run Rules</strong></div></div>
      <div class="settings-row" data-dev-lives-row></div>
      <div class="settings-row"><div class="settings-row__label"><strong>Debug Toggles</strong></div></div>
      <div class="settings-row" data-hitbox-debug-row></div>
    </div>
  `;
  window.DialogOverlay.show({
    title: "Developer",
    bodyHtml,
    buttonText: "Back",
    variant: "settings",
    onRender: ({ bodyEl }) => {
      if (!bodyEl) return;
      const livesRow = bodyEl.querySelector("[data-dev-lives-row]");
      if (livesRow) {
        livesRow.style.display = "flex";
        livesRow.style.flexWrap = "wrap";
        livesRow.style.gap = "8px";
        const livesButton = document.createElement("button");
        livesButton.type = "button";
        livesButton.className = "dialog-overlay__button";
        const syncLivesButton = () => {
          const enabled = Boolean(devTools.threeLivesMode);
          livesButton.textContent = `Lives Mode: ${enabled ? "Dev (3 Lives)" : "Standard (1 Life)"}`;
          livesButton.style.opacity = enabled ? "1" : "0.85";
        };
        syncLivesButton();
        livesButton.addEventListener("click", () => {
          devTools.threeLivesMode = !devTools.threeLivesMode;
          persistDevThreeLivesMode(devTools.threeLivesMode);
          heroLives = getConfiguredHeroLives();
          syncLivesButton();
        });
        livesRow.appendChild(livesButton);
      }
      const hitboxRow = bodyEl.querySelector("[data-hitbox-debug-row]");
      if (hitboxRow) {
        const defs = [
          { key: "npcZones", label: "NPC Zones", custom: true },
          { key: "playerMelee", label: "Player / Melee" },
          { key: "npcs", label: "NPCs" },
          { key: "enemies", label: "Enemies" },
          { key: "projectiles", label: "Projectiles" },
        ];
        hitboxRow.style.display = "flex";
        hitboxRow.style.flexWrap = "wrap";
        hitboxRow.style.gap = "8px";
        defs.forEach(({ key, label, custom }) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "dialog-overlay__button";
          const sync = () => {
            const active = custom ? Boolean(devTools.showNpcZones) : Boolean(window.BattlechurchHitboxDebug?.[key]);
            button.textContent = `${label}: ${active ? "On" : "Off"}`;
            button.style.opacity = active ? "1" : "0.7";
          };
          sync();
          button.addEventListener("click", () => {
            if (custom) {
              devTools.showNpcZones = !devTools.showNpcZones;
            } else {
              window.BattlechurchToggleHitboxDebug?.(key);
            }
            sync();
          });
          hitboxRow.appendChild(button);
        });
      }
      bodyEl.querySelectorAll("[data-dev-action]").forEach((button) => {
        button.addEventListener("click", () => {
          const action = button.getAttribute("data-dev-action");
          if (action === "enemy") {
            window.DialogOverlay.hide();
            window.BattlechurchEnemyEditor?.show?.();
          } else if (action === "level") {
            window.DialogOverlay.hide();
            window.BattlechurchLevelBuilder?.show?.();
          } else if (action === "hitbox") {
            window.DialogOverlay.hide();
            window.BattlechurchHitboxEditor?.setActive?.(true);
          } else if (action === "bossHitbox") {
            window.DialogOverlay.hide();
            window.BattlechurchBossHitboxEditor?.setActive?.(true);
          } else if (action === "shortcuts") {
            showDeveloperShortcutsOverlay();
          }
        });
      });
    },
  });
}

function handleTitleScreen() {
  if (!titleScreenActive) return false;
  if (typeof window !== "undefined" && window.PlayingInstructions?.state?.open) {
    const SCROLL_SPEED = 180;
    if (isActionActive("up")) window.PlayingInstructions.scrollBy(-SCROLL_SPEED * (1 / 60));
    if (isActionActive("down")) window.PlayingInstructions.scrollBy(SCROLL_SPEED * (1 / 60));
    if (keysJustPressed.has("Escape") || keysJustPressed.has("escape") || keysJustPressed.has(" ")) {
      window.PlayingInstructions.close();
      keysJustPressed.delete("Escape");
      keysJustPressed.delete("escape");
      keysJustPressed.delete(" ");
    }
    return true;
  }
  if (window.DialogOverlay?.consumeAction?.()) {
    keysJustPressed.delete(" ");
    keysJustPressed.delete("enter");
    keysJustPressed.delete("Enter");
    keysJustPressed.delete("escape");
    keysJustPressed.delete("Escape");
    return true;
  }
  const developerToolActive = isDeveloperToolActive();
  if (!developerToolActive && !window.DialogOverlay?.isVisible()) {
    const buttons =
      typeof window !== "undefined" && window.__announcementButtons?.key === "title"
        ? window.__announcementButtons.buttons
        : null;
    const getFocusedCloudSaveId = () => {
      const focus =
        typeof window !== "undefined" && window.__announcementFocus?.key === "title"
          ? window.__announcementFocus
          : null;
      if (!focus || !Array.isArray(buttons)) return null;
      const focusedButton = buttons[focus.index] || null;
      const key = String(focusedButton?.key || "");
      if (!key.startsWith("cloudsave:")) return null;
      const saveId = key.slice("cloudsave:".length);
      return saveId || null;
    };
    const resolveCloudTargetSaveId = () =>
      getFocusedCloudSaveId() ||
      titleCloudSelectedSaveId ||
      titleCloudActiveSaveId ||
      titleCloudSaveRows[0]?.id ||
      null;
    const getFocusedTitleRowKey = () => {
      const focus =
        typeof window !== "undefined" && window.__announcementFocus?.key === "title"
          ? window.__announcementFocus
          : null;
      if (!focus || !Array.isArray(buttons)) return null;
      const focusedButton = buttons[focus.index] || null;
      return String(focusedButton?.key || "") || null;
    };
    const escapeHtml = (value) =>
      String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
    const handled = handleAnnouncementButtons({
      key: "title",
      buttons,
      allowSpace: true,
      resolveFocusIndex: ({ buttons, focusIndex, direction }) => {
        if (!Array.isArray(buttons) || buttons.length === 0) return focusIndex;
        if (!titleDemoSaveMenuActive) {
          if (buttons.length <= 1) return focusIndex;
          const linearDirection = direction === "left" || direction === "up" ? -1 : 1;
          return (focusIndex + linearDirection + buttons.length) % buttons.length;
        }
        const current = buttons[focusIndex] || null;
        const rows = buttons
          .map((button, index) => ({ button, index }))
          .filter((entry) => entry.button?.navZone === "rows");
        const actions = buttons
          .map((button, index) => ({ button, index }))
          .filter((entry) => entry.button?.navZone === "actions");
        if (!rows.length && !actions.length) return focusIndex;

        if (current?.navZone === "rows") {
          const rowPos = rows.findIndex((entry) => entry.index === focusIndex);
          if (rowPos < 0) return focusIndex;
          if (direction === "up") return rows[(rowPos - 1 + rows.length) % rows.length].index;
          if (direction === "down") return rows[(rowPos + 1) % rows.length].index;
          if (direction === "right" && actions.length) {
            const firstActionRow = Math.min(...actions.map((entry) => Number(entry.button?.navRow) || 0));
            const target = actions.find((entry) => (Number(entry.button?.navRow) || 0) === firstActionRow);
            return target?.index ?? actions[0].index;
          }
          return focusIndex;
        }

        if (current?.navZone === "actions") {
          const curRow = Number(current.navRow) || 0;
          const curCol = Number(current.navCol) || 0;
          const byRow = (row) => actions.filter((entry) => (Number(entry.button?.navRow) || 0) === row);
          const currentRowButtons = byRow(curRow);
          if (direction === "left") {
            const leftTarget = currentRowButtons.find((entry) => (Number(entry.button?.navCol) || 0) === curCol - 1);
            if (leftTarget) return leftTarget.index;
            if (rows.length) return rows[Math.min(rows.length - 1, curRow)].index;
            return focusIndex;
          }
          if (direction === "right") {
            const rightTarget = currentRowButtons.find((entry) => (Number(entry.button?.navCol) || 0) === curCol + 1);
            return rightTarget?.index ?? focusIndex;
          }
          if (direction === "up") {
            const targetRow = curRow - 1;
            if (targetRow >= 0) {
              const rowButtons = byRow(targetRow);
              if (rowButtons.length) {
                const target = rowButtons.find((entry) => (Number(entry.button?.navCol) || 0) === curCol) || rowButtons[0];
                return target.index;
              }
            }
            if (rows.length) return rows[Math.min(rows.length - 1, Math.max(0, curRow))].index;
            return focusIndex;
          }
          if (direction === "down") {
            const maxRow = Math.max(...actions.map((entry) => Number(entry.button?.navRow) || 0));
            const targetRow = curRow + 1;
            if (targetRow <= maxRow) {
              const rowButtons = byRow(targetRow);
              if (rowButtons.length) {
                const target = rowButtons.find((entry) => (Number(entry.button?.navCol) || 0) === curCol) || rowButtons[0];
                return target.index;
              }
            }
            return focusIndex;
          }
        }

        return focusIndex;
      },
      onFocusChange: (button) => {
        if (!titleDemoSaveMenuActive) return;
        const key = String(button?.key || "");
        if (!key.startsWith("cloudsave:")) return;
        const saveId = key.slice("cloudsave:".length);
        if (saveId) titleCloudSelectedSaveId = saveId;
      },
      onActivate: (button) => {
        if (button.key === "continue" || button.key === "play") {
          setDemoSandboxRunActive(false);
          titleDemoSaveMenuActive = true;
          if (typeof window !== "undefined" && typeof window.playMenuItemPickSfx === "function") {
            window.playMenuItemPickSfx(0.55);
          }
          void refreshTitleCloudSaveOption();
          return;
        }
        if (button.key === "back") {
          setDemoSandboxRunActive(false);
          titleDemoSaveMenuActive = false;
          if (typeof window !== "undefined" && typeof window.playMenuAdvanceSfx === "function") {
            window.playMenuAdvanceSfx(0.55);
          }
          return;
        }
        if (button.key === "loginGoogle") {
          void (async () => {
            if (typeof window !== "undefined" && typeof window.playMenuItemPickSfx === "function") {
              window.playMenuItemPickSfx(0.55);
            }
            try {
              if (window.cloudAuthProvider === "google") {
                await refreshTitleCloudSaveOption();
              } else if (window.Cloud?.signInWithGoogle) {
                await window.Cloud.signInWithGoogle();
                await refreshTitleCloudSaveOption();
              }
            } catch (e) {
              // Keep menu responsive even if Google sign-in popup is blocked/canceled.
            }
          })();
          return;
        }
        if (button.key === "viewCloudSaveDetails") {
          const focusedKey = getFocusedTitleRowKey();
          const focusedCloudId =
            focusedKey && focusedKey.startsWith("cloudsave:")
              ? focusedKey.slice("cloudsave:".length)
              : null;
          const targetCloudId = focusedCloudId || resolveCloudTargetSaveId();
          const cloudRow = targetCloudId
            ? titleCloudSaveRows.find((row) => row.id === targetCloudId) || null
            : null;
          let title = "Save Details";
          let lines = [];
          if (cloudRow?.details) {
            const d = cloudRow.details;
            const townRows = Array.isArray(d.townRows) ? d.townRows : [];
            title = `${d.saveName || "Save"} - Full Details`;
            lines.push(`Player: ${d.playerName || "Pastor"}`);
            lines.push(`Towns Cleared: ${Number(d.completedTowns) || 0}/${Number(d.totalTowns) || 10}`);
            lines.push(`Congregation Total: ${Number(d.totalCongregationBest) || 0}`);
            lines.push(`Town Runs: ${Number(d.totalReplayCompletions) || 0}`);
            lines.push(`Upgrade Levels: ${Number(d.totalUpgradeLevels) || 0}`);
            lines.push("");
            lines.push("Town Breakdown:");
            townRows.forEach((row) => {
              lines.push(
                `${row?.townName || "Town"} | ${row?.p1Completed ? "DONE" : "--"} | C:${Number(row?.bestCount) || 0} R:${Number(row?.completions) || 0} U:${Number(row?.upgradeLevelTotal) || 0}`,
              );
            });
          } else {
            const demoKey = focusedKey && focusedKey.startsWith("slot") ? focusedKey : null;
            const demoSlot = demoKey ? TITLE_DEMO_SAVE_SLOTS.find((slot) => slot.key === demoKey) : null;
            if (demoSlot) {
              const campaignData = demoSlot.campaignData || {};
              title = `${demoSlot.label || "Demo Slot"} - Details`;
              lines.push(`Start Town: ${demoSlot.townId || "unknown"}`);
              lines.push(`Preset Towns Cleared: ${Math.max(0, Number(demoSlot.completedTowns) || 0)}/10`);
              const campaignId = String(campaignData.campaign || "p1").toLowerCase();
              const visitLabel = campaignId === "p1" ? "Visit 1" : campaignId === "p2" ? "Visit 2" : "Visit 3";
              lines.push(`Visit: ${visitLabel}`);
              lines.push(`Start Congregation: ${Math.max(0, Number(campaignData.startCount) || 0)}`);
              lines.push(`Visit Multiplier: x${Number(campaignData.campaignMultiplier || 1).toFixed(2).replace(/\\.00$/, "")}`);
              const upgrades = Object.entries(campaignData.restoredChurchPowerupLevels || {});
              lines.push(
                `Upgrades: ${
                  upgrades.length
                    ? upgrades.map(([id, level]) => `${id} ${Number(level) || 0}`).join(", ")
                    : "None"
                }`,
              );
            }
          }
          if (!lines.length) {
            lines = ["Select a save row first, then choose View Full Details."];
          }
          if (window.DialogOverlay?.show) {
            window.DialogOverlay.show({
              title,
              bodyHtml: `<div class="settings-panel"><pre style="white-space: pre-wrap; max-height: 58vh; overflow-y: auto; margin: 0;">${escapeHtml(lines.join("\n"))}</pre></div>`,
              buttonText: "Close",
              variant: "settings",
            });
          } else if (typeof window?.alert === "function") {
            window.alert(`${title}\n\n${lines.join("\n")}`);
          }
          return;
        }
        if (button.key === "logoutGoogle") {
          void (async () => {
            try {
              if (typeof window !== "undefined" && typeof window.playMenuItemPickSfx === "function") {
                window.playMenuItemPickSfx(0.55);
              }
              setDemoSandboxRunActive(false);
              titleDemoSaveOverride = null;
              if (window.Cloud?.signOut) {
                await window.Cloud.signOut();
              }
              await refreshTitleCloudSaveOption();
            } catch (e) {
              if (typeof window?.alert === "function") {
                window.alert(`Logout failed: ${e?.message || "Unknown error"}`);
              }
            }
          })();
          return;
        }
        if (String(button.key || "").startsWith("cloudsave:")) {
          void (async () => {
            setDemoSandboxRunActive(false);
            titleDemoSaveOverride = null;
            const saveId = String(button.key).slice("cloudsave:".length);
            titleCloudSelectedSaveId = saveId || titleCloudSelectedSaveId;
            if (saveId && typeof window.MapScreen?.setActiveSave === "function") {
              await window.MapScreen.setActiveSave(saveId);
            }
            const selectedRow =
              titleCloudSaveRows.find((row) => row.id === saveId) ||
              titleCloudSaveRows.find((row) => row.id === titleCloudSelectedSaveId) ||
              null;
            const suggestedTownId = selectedRow?.suggestedTownId || null;
            titleScreenActive = false;
            mapActive = true;
            if (window.MapScreen) {
              window.MapScreen.open();
              if (typeof window.MapScreen.reloadProgress === "function") {
                await window.MapScreen.reloadProgress();
              }
              if (suggestedTownId && typeof window.MapScreen.selectTown === "function") {
                window.MapScreen.selectTown(suggestedTownId);
              }
            }
            if (suggestedTownId) {
              activeTownId = suggestedTownId;
              if (typeof window !== "undefined") {
                window.activeTownId = activeTownId;
              }
            }
            titleDemoSaveMenuActive = false;
          })();
          return;
        }
        if (button.key === "newCloudSave") {
          void (async () => {
            const name = typeof window?.prompt === "function"
              ? window.prompt("New save file name:", `Save ${Math.max(1, (titleCloudSaveRows?.length || 0) + 1)}`)
              : null;
            if (!name || !name.trim()) return;
            const playerName = typeof window?.prompt === "function"
              ? window.prompt("Player name:", "Pastor")
              : null;
            if (typeof window.MapScreen?.createSaveFile === "function") {
              const newId = await window.MapScreen.createSaveFile({
                saveName: name.trim(),
                playerName: (playerName || "Pastor").trim(),
                setActive: true,
              });
              if (newId) titleCloudSelectedSaveId = newId;
            }
            await refreshTitleCloudSaveOption();
          })();
          return;
        }
        if (button.key === "duplicateCloudSave") {
          void (async () => {
            const sourceId = resolveCloudTargetSaveId();
            if (!sourceId) return;
            const source = titleCloudSaveRows.find((row) => row.id === sourceId);
            const defaultName = source ? `${source.label.split(" (")[0]} Copy` : "Save Copy";
            const name = typeof window?.prompt === "function"
              ? window.prompt("Save File As:", defaultName)
              : null;
            if (!name || !name.trim()) return;
            if (typeof window.MapScreen?.createSaveFile === "function") {
              const newId = await window.MapScreen.createSaveFile({
                saveName: name.trim(),
                sourceSaveId: sourceId,
                setActive: true,
              });
              if (newId) titleCloudSelectedSaveId = newId;
            }
            await refreshTitleCloudSaveOption();
          })();
          return;
        }
        if (button.key === "renameCloudSave") {
          void (async () => {
            const saveId = resolveCloudTargetSaveId();
            if (!saveId) return;
            const current = titleCloudSaveRows.find((row) => row.id === saveId);
            const currentName = current?.label?.split(" (")[0] || "Save";
            const nextName = typeof window?.prompt === "function"
              ? window.prompt("Rename save file:", currentName)
              : null;
            if (!nextName || !nextName.trim()) return;
            if (typeof window.MapScreen?.renameSaveFile === "function") {
              await window.MapScreen.renameSaveFile(saveId, nextName.trim());
            }
            await refreshTitleCloudSaveOption();
          })();
          return;
        }
        if (button.key === "deleteCloudSave") {
          void (async () => {
            const saveId = resolveCloudTargetSaveId();
            if (!saveId || typeof window.MapScreen?.deleteSaveFile !== "function") return;
            const confirmed =
              typeof window === "undefined" ||
              typeof window.confirm !== "function" ||
              window.confirm("Delete selected save file? This cannot be undone.");
            if (!confirmed) return;
            try {
              const deleted = await window.MapScreen.deleteSaveFile(saveId);
              if (!deleted && typeof window?.alert === "function") {
                window.alert("Could not delete save. You must keep at least one save file.");
              }
            } catch (e) {
              if (typeof window?.alert === "function") {
                window.alert(`Delete failed: ${e?.message || "Unknown error"}`);
              }
            }
            await refreshTitleCloudSaveOption();
          })();
          return;
        }
        if (button.key === "resetGoogleSave") {
          void (async () => {
            const saveId = resolveCloudTargetSaveId();
            if (!saveId) return;
            const confirmed =
              typeof window === "undefined" ||
              typeof window.confirm !== "function" ||
              window.confirm("Reset highlighted save file progress to a fresh start? This cannot be undone.");
            if (!confirmed) return;
            try {
              if (typeof window !== "undefined" && typeof window.playMenuItemPickSfx === "function") {
                window.playMenuItemPickSfx(0.55);
              }
              if (typeof window.MapScreen?.resetSaveFile === "function") {
                const ok = await window.MapScreen.resetSaveFile(saveId);
                if (!ok && typeof window?.alert === "function") {
                  window.alert("Reset failed. Please try again.");
                }
              } else if (window.Cloud?.resetPlayerProgress) {
                // Legacy fallback only if per-save reset is unavailable.
                const ok = await window.Cloud.resetPlayerProgress();
                if (!ok && typeof window?.alert === "function") {
                  window.alert("Reset failed. Please try again.");
                }
              }
              titleCloudSelectedSaveId = saveId;
              titleDemoSaveOverride = null;
              await refreshTitleCloudSaveOption();
            } catch (e) {
              if (typeof window?.alert === "function") {
                window.alert(`Reset failed: ${e?.message || "Unknown error"}`);
              }
            }
          })();
          return;
        }
        if (button.key === "map") {
          // Loading-state fallback: open map directly.
          setDemoSandboxRunActive(false);
          titleScreenActive = false;
          mapActive = true;
          if (window.MapScreen) window.MapScreen.open();
          titleDemoSaveMenuActive = false;
          titleDemoSaveOverride = null;
        } else if (TITLE_DEMO_SAVE_SLOTS.some((entry) => entry.key === button.key)) {
          const slot = TITLE_DEMO_SAVE_SLOTS.find((entry) => entry.key === button.key);
          if (slot?.townId) {
            void (async () => {
              setDemoSandboxRunActive(true);
              await seedDemoSlotProgress(slot);
              titleDemoSaveOverride = {
                townId: slot.townId,
                campaignData: slot.campaignData || null,
              };
              if (typeof window !== "undefined" && window.MapScreen?.selectTown) {
                window.MapScreen.selectTown(slot.townId);
              }
              activeTownId = slot.townId;
              if (typeof window !== "undefined") {
                window.activeTownId = activeTownId;
              }
              titleScreenActive = false;
              mapActive = true;
              if (window.MapScreen?.open) window.MapScreen.open();
              titleDemoSaveMenuActive = false;
            })();
          }
        } else if (button.key === "settings") {
          showSettingsOverlay({ source: "title" });
        } else if (button.key === "developer") {
          showDeveloperOverlay();
        } else if (button.key === "howtoplay") {
          if (typeof window !== "undefined" && window.PlayingInstructions) {
            window.PlayingInstructions.open();
          }
        }
      },
    });
    if (handled) return true;
  }
  keysJustPressed.delete(" ");
  return true;
}

function handleVisitorSessionSkip() {
  if (!visitorSession.active || !keysJustPressed.has("7")) return false;
  visitorSession.summaryReason = visitorSession.summaryReason || "skipped";
  completeVisitorSession("skipped");
  keysJustPressed.delete(" ");
  keysJustPressed.delete("7");
  return true;
}

function prepareVisitorSummaryRecap(announcement) {
  if (announcement?.recapPrepared) return;
  startRecapMusic();
  const saved = visitorSession.savedVisitors || 0;
  const portraits = Array.isArray(visitorSession.newMemberPortraits) ? visitorSession.newMemberPortraits : [];
  const names = Array.isArray(visitorSession.newMemberNames) ? visitorSession.newMemberNames : [];
  const congregationTotal = getCongregationSize();
  const startCount = Math.max(0, congregationTotal - saved);
  const npcHealthBreakdown = portraits.map((portrait, i) => ({
    name: names[i] || "",
    portrait,
    active: true,
  }));
  announcement.recapData = {
    id: `visitor-recap-${Date.now()}`,
    title: "Visitor Report",
    startCount,
    totalDelta: saved,
    totalCount: congregationTotal,
    problemTitle: "",
    lines: [{
      label: "New Members:",
      delta: saved,
      kind: "visitorProfiles",
      affectsTotal: true,
      npcHealthBreakdown,
    }],
    graceBonus: 0,
    graceBonusCongregants: 0,
    graceApplied: false,
    graceAppliedCount: 0,
    graceSpawned: false,
  };
  announcement.recapPrepared = true;
}

function handleVisitorSummary() {
  if (!visitorSession.active || !visitorSession.summaryActive) return false;
  if (!visitorSession.recapShown) {
    visitorSession.recapShown = true;
    const announcement = {
      requiresConfirm: true,
      isVisitorSummary: true,
      title: "Visitor Report",
      skipMissionBrief: true,
      summaryReason: visitorSession.summaryReason || "summary",
    };
    prepareVisitorSummaryRecap(announcement);
    levelAnnouncements.push(announcement);
  }
  // Once the announcement is queued, let handleLevelAnnouncements take over
  // so it can handle Continue/dismiss input normally.
  return false;
}

function handleVisitorIntro() {
  if (!visitorSession.active || !visitorSession.introActive) return false;
  const buttons =
    typeof window !== "undefined" && window.__announcementButtons?.key === "visitorIntro"
      ? window.__announcementButtons.buttons
      : null;
  const handled = handleAnnouncementButtons({
    key: "visitorIntro",
    buttons,
    allowSpace: true,
    onActivate: () => {
      visitorSession.introActive = false;
      keysJustPressed.delete(" ");
      if (typeof window !== "undefined" && typeof window.playMenuAdvanceSfx === "function") {
        window.playMenuAdvanceSfx(0.55);
      }
    },
  });
  if (handled) return true;
  if (
    wasActionJustPressed("restart") ||
    wasActionJustPressed("pause") ||
    keysJustPressed.has("7")
  ) {
    visitorSession.introActive = false;
    keysJustPressed.delete(" ");
    keysJustPressed.delete("7");
  }
  return true;
}

function getAnnouncementNavDirection() {
  let direction = 0;
  const leftKeys = ["arrowleft", "a", "arrowup", "w"];
  const rightKeys = ["arrowright", "d", "arrowdown", "s"];
  if (leftKeys.some((key) => keysJustPressed.has(key))) direction = -1;
  if (rightKeys.some((key) => keysJustPressed.has(key))) direction = 1;
  if (direction !== 0) {
    leftKeys.forEach((key) => keysJustPressed.delete(key));
    rightKeys.forEach((key) => keysJustPressed.delete(key));
    return direction;
  }
  if (typeof Input === "undefined" || typeof Input.isActionActive !== "function") {
    announcementNavHoldDir = null;
    announcementNavNextTime = 0;
    return 0;
  }
  const hasHoldInputSource =
    Boolean(Input.virtualInput?.enabled) || Boolean(Input.gamepadState?.movement?.active);
  if (!hasHoldInputSource) {
    announcementNavHoldDir = null;
    announcementNavNextTime = 0;
    return 0;
  }
  const leftActive = Input.isActionActive("left") || Input.isActionActive("up");
  const rightActive = Input.isActionActive("right") || Input.isActionActive("down");
  const nextDir = leftActive ? -1 : rightActive ? 1 : 0;
  if (!nextDir) {
    announcementNavHoldDir = null;
    announcementNavNextTime = 0;
    return 0;
  }
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  const initialDelayMs = 280;
  const repeatDelayMs = 140;
  if (announcementNavHoldDir !== nextDir) {
    announcementNavHoldDir = nextDir;
    announcementNavNextTime = now + initialDelayMs;
    return nextDir;
  }
  if (now >= announcementNavNextTime) {
    announcementNavNextTime = now + repeatDelayMs;
    return nextDir;
  }
  return 0;
}

function getAnnouncementNavCardinal() {
  const leftKeys = ["arrowleft", "a"];
  const rightKeys = ["arrowright", "d"];
  const upKeys = ["arrowup", "w"];
  const downKeys = ["arrowdown", "s"];
  if (leftKeys.some((key) => keysJustPressed.has(key))) {
    leftKeys.forEach((key) => keysJustPressed.delete(key));
    return "left";
  }
  if (rightKeys.some((key) => keysJustPressed.has(key))) {
    rightKeys.forEach((key) => keysJustPressed.delete(key));
    return "right";
  }
  if (upKeys.some((key) => keysJustPressed.has(key))) {
    upKeys.forEach((key) => keysJustPressed.delete(key));
    return "up";
  }
  if (downKeys.some((key) => keysJustPressed.has(key))) {
    downKeys.forEach((key) => keysJustPressed.delete(key));
    return "down";
  }
  return null;
}

function handleAnnouncementButtons({ key, buttons, onActivate, onFocusChange, resolveFocusIndex, allowSpace = true }) {
  if (!Array.isArray(buttons) || buttons.length === 0) return false;
  const focus = typeof window !== "undefined" ? window.__announcementFocus : null;
  let focusIndex = focus && focus.key === key ? focus.index : 0;
  if (!Number.isFinite(focusIndex) || focusIndex < 0 || focusIndex >= buttons.length) {
    focusIndex = 0;
  }
  const previousIndex = focusIndex;
  const cardinalDirection = getAnnouncementNavCardinal();
  if (cardinalDirection) {
    if (typeof resolveFocusIndex === "function") {
      const resolved = resolveFocusIndex({ buttons, focusIndex, direction: cardinalDirection });
      if (
        Number.isFinite(resolved) &&
        resolved >= 0 &&
        resolved < buttons.length
      ) {
        focusIndex = resolved;
      }
    } else if (buttons.length > 1) {
      const linearDirection = cardinalDirection === "left" || cardinalDirection === "up" ? -1 : 1;
      focusIndex = (focusIndex + linearDirection + buttons.length) % buttons.length;
    }
  } else {
    const direction = getAnnouncementNavDirection();
    if (direction !== 0 && buttons.length > 1) {
      focusIndex = (focusIndex + direction + buttons.length) % buttons.length;
    }
  }
  if (focusIndex !== previousIndex && typeof window?.playMenuMoveSfx === "function") {
    window.playMenuMoveSfx(0.45);
  }
  if (typeof window !== "undefined") {
    window.__announcementFocus = { key, index: focusIndex };
  }
  if (
    typeof onFocusChange === "function" &&
    (
      focusIndex !== previousIndex ||
      !focus ||
      focus.key !== key ||
      !Number.isFinite(focus.index)
    )
  ) {
    onFocusChange(buttons[focusIndex], focusIndex);
  }
  const clickPos = Input.consumeCanvasClick?.();
  if (clickPos) {
    const hitIndex = buttons.findIndex(
      (btn) =>
        clickPos.x >= btn.x &&
        clickPos.x <= btn.x + btn.width &&
        clickPos.y >= btn.y &&
        clickPos.y <= btn.y + btn.height,
    );
    if (hitIndex >= 0) {
      focusIndex = hitIndex;
      if (typeof window !== "undefined") {
        window.__announcementFocus = { key, index: focusIndex };
      }
      if (typeof onActivate === "function") {
        onActivate(buttons[hitIndex], hitIndex);
      }
      return true;
    }
  }
  const confirmKeys = [" ", "enter", "Enter"];
  if (window.__battlechurchSuppressMenuConfirmUntilRelease) {
    const confirmStillHeld = confirmKeys.some((k) => keysPressed.has(k));
    if (confirmStillHeld) {
      return false;
    }
    window.__battlechurchSuppressMenuConfirmUntilRelease = false;
  }
  if (allowSpace && confirmKeys.some((k) => keysJustPressed.has(k))) {
    confirmKeys.forEach((k) => keysJustPressed.delete(k));
    if (typeof onActivate === "function") {
      onActivate(buttons[focusIndex], focusIndex);
    }
    return true;
  }
  const cancelKeys = ["escape", "Escape"];
  if (cancelKeys.some((k) => keysJustPressed.has(k))) {
    cancelKeys.forEach((k) => keysJustPressed.delete(k));
    const cancelIndex = buttons.findIndex((button) =>
      ["back", "resume", "continue", "close"].includes(String(button?.key || "").toLowerCase())
    );
    if (cancelIndex >= 0 && typeof onActivate === "function") {
      onActivate(buttons[cancelIndex], cancelIndex);
      return true;
    }
  }
  return false;
}

function handleLevelAnnouncements() {
  const missionButtons =
    typeof window !== "undefined" ? window.__missionBriefButtonBounds : null;
  const missionActive =
    typeof window !== "undefined" ? window.__missionBriefActive : false;
  if (missionActive && Array.isArray(missionButtons) && missionButtons.length) {
    const handled = handleAnnouncementButtons({
      key: "missionBrief",
      buttons: missionButtons,
      allowSpace: true,
      onActivate: (button) => {
        if (button.key === "continue") {
          dismissCurrentLevelAnnouncement();
          if (typeof window !== "undefined" && typeof window.playMenuAdvanceSfx === "function") {
            window.playMenuAdvanceSfx(0.55);
          }
          return;
        }
        if (typeof window !== "undefined" && typeof window.playMenuItemPickSfx === "function") {
          window.playMenuItemPickSfx(0.55);
        }
        if (typeof window.selectFormation === "function") {
          window.selectFormation(button.key);
        }
        if (typeof window.startBattleMusicFromFormation === "function") {
          window.startBattleMusicFromFormation();
        }
        if (typeof window.applyFormationAnchors === "function") {
          try { window.applyFormationAnchors(); } catch (e) {}
        }
        dismissCurrentLevelAnnouncement();
      },
    });
    if (handled) return true;
  }
  if (!levelAnnouncements.length || !levelAnnouncements[0].requiresConfirm) return false;
  const currentAnnouncement = levelAnnouncements[0];
  const isSummary = isBattleSummaryAnnouncement(currentAnnouncement);
  if (isSummary) {
    if (!currentAnnouncement.recapPrepared) {
      const battleSummary = levelManager?.getLastBattleSummary?.() || {};
      const savedCount = Number.isFinite(battleSummary?.savedCount) ? battleSummary.savedCount : 0;
      const lostCount = Number.isFinite(battleSummary?.lostCount) ? battleSummary.lostCount : 0;
      const upgradeAfter = Boolean(window.UpgradeScreen);
      showBattleSummaryDialog(currentAnnouncement, savedCount, lostCount, upgradeAfter);
    }
    if (!currentAnnouncement._recapIntroFadeStarted) {
      currentAnnouncement._recapIntroFadeStarted = true;
      startRecapIntroFade(0.95);
    }
    const buttons =
      typeof window !== "undefined" && window.__announcementButtons?.key === "recap"
        ? window.__announcementButtons.buttons
        : null;
    const canContinueRecap = typeof window !== "undefined" && window.__recapAllowContinue;
    const recapSkipKeys = [" ", "enter", "Enter"];
    if (!canContinueRecap && recapSkipKeys.some((k) => keysJustPressed.has(k))) {
      recapSkipKeys.forEach((k) => keysJustPressed.delete(k));
      if (typeof window !== "undefined") {
        window.__recapSkipRequested = true;
      }
      return true;
    }
    const handled = handleAnnouncementButtons({
      key: "recap",
      buttons,
      allowSpace: Boolean(canContinueRecap),
      onActivate: () => {
        graceRushBlackout = false;
        graceRushFadeHold = false;
        graceRushFadeTimer = 0;
        graceRushFadeDuration = 0;
        graceRushFadeAlpha = 0;
        // Determine if this is the final level of the current town
        const levelsPerTown = Number.isFinite(window.BATTLES_PER_TOWN) ? window.BATTLES_PER_TOWN : 3;
        const isFinalTownLevel = lastCompletedLevel >= levelsPerTown;

        // Record town completion and save score only for FINAL level of town
        if (currentAnnouncement.levelSummary) {
          const recapData = currentAnnouncement.recapData;
          const finalScore = Number.isFinite(recapData?.totalCount)
            ? recapData.totalCount
            : getCongregationSize();
          if (typeof window !== "undefined") {
            window.lastRunScore = finalScore;
          }
          // Only record town completion on the FINAL level of the town
          if (isFinalTownLevel && window.MapScreen?.recordTownCompletion && !demoSandboxRunActive) {
            const powerupSnapshot = Object.fromEntries(churchPowerupLevels);
            window.MapScreen.recordTownCompletion(activeTownId, finalScore, activeCampaign, powerupSnapshot);
          }
        }
        if (currentAnnouncement.recapFinalYear) {
          // Campaign final (Level 25 / capital)
          pendingUpgradeAfterSummary = false;
          queuePastorFinalAnnouncement();
        } else if (currentAnnouncement.levelSummary && isFinalTownLevel) {
          // Final level of this town - show upgrade screen first, then pastor post-recap
          pendingUpgradeAfterSummary = true;
          pendingPastorPostRecapAfterUpgrade = true;
        } else if (currentAnnouncement.levelSummary) {
          // Mid-town level (Level 1 or 2) - trigger upgrade screen + chapter break
          pendingUpgradeAfterSummary = true;
        } else {
          pendingUpgradeAfterSummary = Boolean(currentAnnouncement.recapUpgradeAfter);
        }
        const recapData = currentAnnouncement.recapData;
        if (recapData && !recapData.graceApplied && recapData.graceBonus > 0) {
          const appliedCount = Number.isFinite(recapData.graceAppliedCount)
            ? recapData.graceAppliedCount
            : 0;
          const remaining = Math.max(0, recapData.graceBonus - appliedCount);
          if (remaining > 0) {
            addGrace(remaining);
          }
          recapData.graceApplied = true;
        }
        dismissCurrentLevelAnnouncement();
        if (typeof window !== "undefined" && typeof window.playMenuAdvanceSfx === "function") {
          window.playMenuAdvanceSfx(0.55);
        }
      },
    });
    if (handled) return true;
    return true;
  }
  if (currentAnnouncement.isVisitorSummary) {
    if (!currentAnnouncement.recapPrepared) {
      prepareVisitorSummaryRecap(currentAnnouncement);
    }
    const buttons =
      typeof window !== "undefined" && window.__announcementButtons?.key === "recap"
        ? window.__announcementButtons.buttons
        : null;
    const canContinueRecap = typeof window !== "undefined" && window.__recapAllowContinue;
    const recapSkipKeys = [" ", "enter", "Enter"];
    if (!canContinueRecap && recapSkipKeys.some((k) => keysJustPressed.has(k))) {
      recapSkipKeys.forEach((k) => keysJustPressed.delete(k));
      if (typeof window !== "undefined") window.__recapSkipRequested = true;
      return true;
    }
    const handled = handleAnnouncementButtons({
      key: "recap",
      buttons,
      allowSpace: Boolean(canContinueRecap),
      onActivate: () => {
        graceRushBlackout = false;
        graceRushFadeHold = false;
        graceRushFadeTimer = 0;
        graceRushFadeDuration = 0;
        graceRushFadeAlpha = 0;
        dismissCurrentLevelAnnouncement();
        if (typeof window !== "undefined" && typeof window.playMenuAdvanceSfx === "function") {
          window.playMenuAdvanceSfx(0.55);
        }
      },
    });
    if (handled) return true;
    return true;
  }
  if (currentAnnouncement.pastorFinal) {
    if (!currentAnnouncement._revealComplete) return true;
    const buttons =
      typeof window !== "undefined" && window.__announcementButtons?.key === "pastorFinal"
        ? window.__announcementButtons.buttons
        : null;
    const handled = handleAnnouncementButtons({
      key: "pastorFinal",
      buttons,
      allowSpace: true,
      onActivate: () => {
        dismissCurrentLevelAnnouncement();
        activateEpilogue();
      },
    });
    if (handled) return true;
    const clickPos = Input.consumeCanvasClick?.();
    if (clickPos) {
      dismissCurrentLevelAnnouncement();
      activateEpilogue();
      return true;
    }
    return true;
  }
  if (currentAnnouncement.pastorPostRecap) {
    if (currentAnnouncement.pastorPostRecapDelay) {
      const now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
      const lastTick = currentAnnouncement._lastTick || now;
      const dt = Math.max(0, (now - lastTick) / 1000);
      currentAnnouncement._lastTick = now;
      const remaining =
        typeof currentAnnouncement.pastorPostRecapDelayRemaining === "number"
          ? currentAnnouncement.pastorPostRecapDelayRemaining
          : currentAnnouncement.pastorPostRecapDelay;
      const nextRemaining = Math.max(0, remaining - dt);
      currentAnnouncement.pastorPostRecapDelayRemaining = nextRemaining;
      if (nextRemaining > 0) {
        return true;
      }
    }
    if (!currentAnnouncement._revealComplete) return true;
    const buttons =
      typeof window !== "undefined" && window.__announcementButtons?.key === "pastorPostRecap"
        ? window.__announcementButtons.buttons
        : null;
    const handled = handleAnnouncementButtons({
      key: "pastorPostRecap",
      buttons,
      allowSpace: true,
      onActivate: () => {
        dismissCurrentLevelAnnouncement();
        // Activate town victory scene before returning to map
        const mapData = typeof window !== "undefined" ? window.BattlechurchMapData : null;
        const townName = mapData?.towns?.find((t) => t.id === activeTownId)?.name || "This town";
        const score = typeof window !== "undefined" && Number.isFinite(window.lastRunScore) ? window.lastRunScore : 0;
        activateTownVictory(townName, score);
      },
    });
    if (handled) return true;
    const clickPos = Input.consumeCanvasClick?.();
    if (clickPos) {
      dismissCurrentLevelAnnouncement();
      // Activate town victory scene before returning to map
      const mapData = typeof window !== "undefined" ? window.BattlechurchMapData : null;
      const townName = mapData?.towns?.find((t) => t.id === activeTownId)?.name || "This town";
      const score = typeof window !== "undefined" && Number.isFinite(window.lastRunScore) ? window.lastRunScore : 0;
      activateTownVictory(townName, score);
      return true;
    }
    return true;
  }
  if (currentAnnouncement.exteriorShot) {
    if (!currentAnnouncement._musicStarted) {
      currentAnnouncement._musicStarted = true;
      if (typeof startExteriorMusic === "function") {
        const status = levelManager?.getStatus ? levelManager.getStatus() : null;
        const bossBattleNumber =
          typeof window !== "undefined" && Number.isFinite(window.MONTHS_PER_LEVEL)
            ? window.MONTHS_PER_LEVEL
            : 4;
        // Check if this is a boss exterior - either by battle number OR by pending boss flag (from dev hotkey 5)
        const isBossExterior = pendingBossIntroAfterExterior ||
          (Number.isFinite(status?.battle) && status.battle >= bossBattleNumber);
        startExteriorMusic({ boss: isBossExterior });
      }
    }
    const now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    const lastTick = currentAnnouncement._lastTick || now;
    const dt = Math.max(0, (now - lastTick) / 1000);
    currentAnnouncement._lastTick = now;
    currentAnnouncement.timer = Math.max(0, (currentAnnouncement.timer || 0) - dt);
    if (currentAnnouncement.timer <= 0) {
      startTownIntroTransition();
      return true;
    }
    const clickPos = Input.consumeCanvasClick?.();
    if (clickPos) {
      startTownIntroTransition();
      return true;
    }
    const skipKeys = ["enter", "Enter"];
    if (wasActionJustPressed("pause") || wasActionJustPressed("restart") || skipKeys.some((k) => keysJustPressed.has(k))) {
      skipKeys.forEach((k) => keysJustPressed.delete(k));
      keysJustPressed.delete(" ");
      keysJustPressed.delete("pause");
      keysJustPressed.delete("restart");
      startTownIntroTransition();
      return true;
    }
    return true;
  }
  if (currentAnnouncement.townIntro) {
    const buttons =
      typeof window !== "undefined" && window.__announcementButtons?.key === "chapterBreak"
        ? window.__announcementButtons.buttons
      : null;
    const handled = handleAnnouncementButtons({
      key: "chapterBreak",
      buttons,
      allowSpace: true,
      onActivate: () => {
        startTownIntroTransition();
        if (typeof window !== "undefined" && typeof window.playMenuAdvanceSfx === "function") {
          window.playMenuAdvanceSfx(0.55);
        }
      },
    });
    if (handled) return true;
  }
  if (wasActionJustPressed("pause") || wasActionJustPressed("restart")) {
    if (currentAnnouncement.townIntro) {
      startTownIntroTransition();
    } else {
      dismissCurrentLevelAnnouncement();
    }
    if (typeof window !== "undefined" && typeof window.playMenuAdvanceSfx === "function") {
      window.playMenuAdvanceSfx(0.55);
    }
    keysJustPressed.delete(" ");
  }
  return true;
}

function updateCongregationStage(dt, levelStatus) {
  let stage = levelStatus?.stage;
  let congregationStageActive = stage === "levelIntro";
  if (!congregationStageActive) return { updated: false, levelStatus };
  const tutorialHintsEnabled =
    typeof window === "undefined" ? true : window.__congregationShowTutorialHints !== false;
  if (!mapAmbientFadeQueued && typeof window !== "undefined" && window.MapScreen?.stopAmbient) {
    mapAmbientFadeQueued = true;
    window.MapScreen.stopAmbient({ fade: true });
  }

  const buttons =
    typeof window !== "undefined" && window.__announcementButtons?.key === "congregation"
      ? window.__announcementButtons.buttons
      : null;
  const handled = handleAnnouncementButtons({
    key: "congregation",
    buttons,
    allowSpace: true,
    onActivate: () => {
      if (typeof levelManager?.advanceFromCongregation !== "function") return;
      const now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
      if (pendingTownIntroStart && now - townIntroDismissedAt < 300) {
        Input.consumeCanvasClick?.();
        return;
      }
      if (pendingTownIntroStart) {
        pendingTownIntroStart = false;
        suppressInitialAnnouncements = false;
      }
      // Clear any pending prayer bomb input to prevent accidental activation
      if (typeof Input !== "undefined" && "prayerBombClickQueued" in Input) {
        Input.prayerBombClickQueued = false;
      }
      if (player) { player.prayerCharge = 0; player.prayerHoldLocked = false; }
      if (typeof window !== "undefined") window.__congregationTutorialActive = false;
      clearCongregationSpeechBubbles();
      levelManager.advanceFromCongregation();
      playCongregationFightSfx(0.65);
      levelStatus = levelManager?.getStatus ? levelManager.getStatus() : null;
      stage = levelStatus?.stage;
    },
  });
  if (handled) return { updated: true, levelStatus };
  if (!powerUpsClearedForCongregation) {
    clearAllPowerUps();
    powerUpsClearedForCongregation = true;
  }
  if (typeof window !== "undefined") window.__congregationTutorialActive = tutorialHintsEnabled;
  if (tutorialHintsEnabled && !congregationTutorialPrayerInit && player) {
    const fiveSixths = Math.round((player.prayerChargeRequired || 60) * 5 / 6);
    player.prayerCharge = fiveSixths;
    player.prayerHoldLocked = false;
    congregationTutorialPrayerInit = true;
    congregationTutorialRefillTimer = 0;
  }
  if (tutorialHintsEnabled && player && congregationTutorialPrayerInit) {
    const fiveSixths = Math.round((player.prayerChargeRequired || 60) * 5 / 6);
    if (player.prayerCharge < fiveSixths) {
      player.prayerCharge = fiveSixths;
      player.prayerHoldLocked = false;
    }
  }
  if (tutorialHintsEnabled) {
    const activeWelcomeLines = getActiveCongregationWelcomeLines();
    const welcomeHintLimit = Math.min(MAX_CONGREGATION_WELCOME_HINTS, activeWelcomeLines.length);
    if (!congregationGreetingShown) {
      heroSay("I'm glad to see you all!", { life: 3.6 });
      congregationGreetingShown = true;
      congregationWelcomeTimer = 2.2;
    }
    congregationWelcomeTimer -= dt;
    if (congregationWelcomeTimer <= 0 && congregationGreetingCount < welcomeHintLimit && activeWelcomeLines.length && congregationMembers.length) {
      const now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
      const available = congregationMembers.filter(
        (m) => m && (!Number.isFinite(m.dialogueCooldownUntil) || now >= m.dialogueCooldownUntil) && !m.dialogueBubble
      );
      if (available.length) {
        const member = available[Math.floor(Math.random() * available.length)];
        const line = activeWelcomeLines[congregationGreetingCount % activeWelcomeLines.length];
        if (member.dialogueBubble) {
          member.dialogueBubble.life = 0;
          member.dialogueBubble = null;
        }
        const bubble = addFloatingTextAt(
          member.x,
          member.y - member.radius - 20,
          line,
          "#f4fbff",
          { speechBubble: true, vy: 0, life: 8.0, fadeDelay: 7.0, entity: member, offsetY: -member.radius - 20, bubbleTheme: "npc" }
        );
        member.dialogueBubble = bubble || null;
        member.dialogueCooldownUntil = now + CONGREGATION_DIALOGUE_COOLDOWN_MS;
        congregationGreetingCount += 1;
      }
      congregationWelcomeTimer = 7.5 + Math.random() * 1.5;
    }
  } else {
    congregationGreetingShown = false;
    congregationWelcomeTimer = 0;
    congregationGreetingCount = 0;
    clearCongregationSpeechBubbles();
  }
  updateCongregationMembers(dt);
  resolveCongregationMemberCollisions();
  updatePlayerDuringCongregation(dt);
  resolveCongregationCollisions();

  if (wasActionJustPressed("pause") || wasActionJustPressed("restart")) {
    try {
      const status = levelManager?.getStatus ? levelManager.getStatus() : null;
      if (status?.stage === 'briefing' && typeof levelManager.advanceFromBriefing === 'function') {
        levelManager.advanceFromBriefing();
        if (typeof window !== "undefined" && typeof window.playMenuAdvanceSfx === "function") {
          window.playMenuAdvanceSfx(0.55);
        }
        paused = false;
        keysJustPressed.delete(' ');
        levelStatus = levelManager?.getStatus ? levelManager.getStatus() : null;
        stage = levelStatus?.stage;
      } else if (wasActionJustPressed("pause")) {
        const now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
        if (pendingTownIntroStart && now - townIntroDismissedAt < 300) {
          keysJustPressed.delete(" ");
          keysJustPressed.delete("pause");
          keysJustPressed.delete("restart");
          return { updated: true, levelStatus };
        }
        if (pendingTownIntroStart) {
          pendingTownIntroStart = false;
          suppressInitialAnnouncements = false;
        }
        // Clear any pending prayer bomb input to prevent accidental activation
        if (typeof Input !== "undefined" && "prayerBombClickQueued" in Input) {
          Input.prayerBombClickQueued = false;
        }
        if (player) { player.prayerCharge = 0; player.prayerHoldLocked = false; }
        if (typeof window !== "undefined") window.__congregationTutorialActive = false;
        clearCongregationSpeechBubbles();
        levelManager?.advanceFromCongregation?.();
        playCongregationFightSfx(0.65);
        keysJustPressed.delete(" ");
        levelStatus = levelManager?.getStatus ? levelManager.getStatus() : null;
        stage = levelStatus?.stage;
      }
    } catch (e) {}
  }
  congregationStageActive = stage === "levelIntro";
  if (!congregationStageActive) {
    powerUpsClearedForCongregation = false;
    congregationGreetingShown = false;
    congregationWelcomeTimer = 0;
    congregationGreetingCount = 0;
    mapAmbientFadeQueued = false;
    congregationTutorialPrayerInit = false;
    if (typeof window !== "undefined") window.__congregationTutorialActive = false;
  }
  return { updated: true, levelStatus };
}

function updateCameraAndVisualEffects(dt) {
  updateBossLightningAtmosphere(dt);
  if (cameraShakeTimer > 0) {
    cameraShakeTimer = Math.max(0, cameraShakeTimer - dt);
  }

  try {
    const desired = player.x - canvas.width / 2;
    const clamped = Math.max(-CAMERA_SCROLL_LIMIT, Math.min(CAMERA_SCROLL_LIMIT, desired));
    cameraOffsetX += (clamped - cameraOffsetX) * Math.min(1, dt * 8);
    backgroundPan.mid = backgroundPan.mid || { x: 0 };
    backgroundPan.far = backgroundPan.far || { x: 0 };
    backgroundPan.mid.x = cameraOffsetX * 0.45;
    backgroundPan.far.x = cameraOffsetX * 0.18;
  } catch (e) {}

  if (hitFreezeTimer > 0) {
    hitFreezeTimer = Math.max(0, hitFreezeTimer - dt);
  }

  hpFlashTimer = Math.max(0, hpFlashTimer - dt);
  damageHitFlash = Math.max(0, damageHitFlash - dt);
  heroRescueCooldown = Math.max(0, heroRescueCooldown - dt);
  prayerBombScreenFadeTimer = Math.max(0, prayerBombScreenFadeTimer - dt);
}

function handlePauseMenu() {
  if (typeof window !== "undefined" && window.PlayingInstructions?.state?.open) {
    const SCROLL_SPEED = 180;
    if (isActionActive("up")) window.PlayingInstructions.scrollBy(-SCROLL_SPEED * (1 / 60));
    if (isActionActive("down")) window.PlayingInstructions.scrollBy(SCROLL_SPEED * (1 / 60));
    if (keysJustPressed.has("Escape") || keysJustPressed.has("escape") || keysJustPressed.has(" ")) {
      window.PlayingInstructions.close();
      keysJustPressed.delete("Escape");
      keysJustPressed.delete("escape");
      keysJustPressed.delete(" ");
    }
    return true;
  }
  if (window.DialogOverlay?.consumeAction?.() || window.UpgradeScreen?.consumeAction?.()) {
    return true;
  }
  const overlayActive = Boolean(
    window.DialogOverlay?.isVisible?.() || window.UpgradeScreen?.isVisible?.(),
  );
  if (overlayActive) {
    keysJustPressed.delete(" ");
  }
  if (!overlayActive && !paused && wasActionJustPressed("pause")) {
    paused = true;
    if (!gameOver) {
      window.isPauseOverlayActive = true;
      pauseRestartConfirmActive = false;
      if (typeof window !== "undefined" && typeof window.pauseAllMusic === "function") {
        window.pauseAllMusic();
      }
    }
  }
  if (paused && !gameOver) {
    const buttons =
      typeof window !== "undefined" && window.__announcementButtons?.key === "pause"
        ? window.__announcementButtons.buttons
        : null;
    const handled = handleAnnouncementButtons({
      key: "pause",
      buttons,
      allowSpace: true,
      onActivate: (button) => {
        if (button.key === "map") {
          returnToMapFromPause();
          return;
        }
        if (button.key === "howToPlay") {
          pauseRestartConfirmActive = false;
          if (typeof window !== "undefined" && window.PlayingInstructions) {
            window.PlayingInstructions.open();
          }
          return;
        }
        if (button.key === "settings") {
          pauseRestartConfirmActive = false;
          showSettingsOverlay({ source: "pause" });
          return;
        }
        if (button.key === "developer") {
          pauseRestartConfirmActive = false;
          showDeveloperOverlay();
          return;
        }
        pauseRestartConfirmActive = false;
        resumeFromPause();
      },
    });
    if (handled) return true;
  }
  return false;
}

function updatePlayer(dt, deathFreezeActive, playerUpdatedDuringCongregation) {
  const playerDt = consumeEntityMeleeHitstopDt(player, dt);
  window.__battlechurchPlayerMeleeHitstopActive = Boolean(player && playerDt <= 0 && dt > 0);

  // Suppress prayer bomb BEFORE player.update consumes it, for combos that intercept C input.
  if (window._meleeAttackState && player && typeof Input !== "undefined") {
    const _ms = window._meleeAttackState;
    const nowPre = typeof performance !== "undefined" ? performance.now() : Date.now();
    const comboWinMs = (typeof MELEE_DOUBLE_TAP_WINDOW === "number" ? MELEE_DOUBLE_TAP_WINDOW : 0.18) * 1000;

    // A+C super: arm when both meters are simultaneously full with enough prayer
    const prayerSuperCost = (player.prayerChargeRequired || 60) / 3;
    const bothFull =
      _ms.isCharging &&
      _ms.buttonDown &&
      _ms.chargeTimer >= (_ms.holdTime || 0) &&
      player.prayerHoldLocked &&
      (player.prayerCharge || 0) >= prayerSuperCost;
    if (bothFull) _ms.acSuperArmed = true;

    // A+B Sword Rush: arm when both A and B charge meters are simultaneously full
    const abBothFull =
      _ms.isCharging &&
      _ms.buttonDown &&
      _ms.chargeTimer >= (_ms.holdTime || 0) &&
      _ms.spinButtonDown &&
      _ms.spinCharging &&
      _ms.spinChargeTimer >= (_ms.spinHoldTime || 0);
    if (abBothFull) _ms.abSuperArmed = true;

    // C→A combo: C was pressed recently and A is being pressed this frame
    const cLastPressed = (_ms.lastComboTimes && _ms.lastComboTimes.C) || 0;
    const cRecentForCombo = cLastPressed > 0 && (nowPre - cLastPressed) <= comboWinMs;
    const aJustPressedNow = keysJustPressed.has("ArrowLeft") || keysJustPressed.has(" ");
    const prayerStrikeBlocking = cRecentForCombo && aJustPressedNow &&
      (player.prayerCharge || 0) >= (player.prayerChargeRequired || 60) / 3;

    // Suppress prayer bomb whenever either intercept is active, or B is charging (holdB+holdC teleport)
    const bChargingSuppressBomb = Boolean(_ms.spinButtonDown || _ms.bcTeleportArmed || (_ms.bcTeleportBlockTimer || 0) > 0 || (_ms.cBHolyDashBlockTimer || 0) > 0);
    if (_ms.acSuperArmed || prayerStrikeBlocking || bChargingSuppressBomb) {
      Input.prayerBombClickQueued = false;
    }
    // Cancel any pending congregation tap whenever a C+A or C+B combo is intercepting C.
    if ((_ms.acSuperArmed || prayerStrikeBlocking) && typeof cancelCongregationTap === "function") {
      cancelCongregationTap();
    }
  }

  if (playerUpdatedDuringCongregation) {
    updateAimAssist();
    return;
  }
  if (!deathFreezeActive) {
    updateAimFromKeyboard();
    updateAimAssist();

    if (keysJustPressed.has("ArrowDown")) {
      playerDashState.pendingDashTimer = DASH_COMBO_GRACE;
      playerDashState.pendingDashDir = getDashButtonDirection();
    }
    if (playerDashState.pendingDashTimer > 0) {
        const comboSwipe = window.Input?.peekComboSwipe?.();
        const comboSwipeActive =
          keysPressed.has("ArrowLeft") ||
          (comboSwipe && ((comboSwipe.from === "A" && comboSwipe.to === "B") || (comboSwipe.from === "B" && comboSwipe.to === "A")));
      if (comboSwipeActive) {
        playerDashState.pendingDashTimer = 0;
      } else {
        playerDashState.pendingDashTimer = Math.max(0, playerDashState.pendingDashTimer - playerDt);
        if (playerDashState.pendingDashTimer === 0) {
          if (tryStartDash(playerDashState.pendingDashDir)) {
            keysJustPressed.delete("ArrowDown");
          }
        }
      }
    }

    // Update dash movement
    if (playerDashState.isDashing) {
      updateDashMovement(playerDt);
    }

    player.update(playerDt);
  } else {
    updateAimAssist();
    if (player && player.state === "death") {
      player.animator.update(dt);
    }
  }
}

function getTormentorFlameOrbitSettings(enemy) {
  const hitboxRect = getEnemyHitboxRect(enemy);
  const hitboxWidth = hitboxRect ? hitboxRect.width : (enemy?.radius || 16) * 2;
  const hitboxHeight = hitboxRect ? hitboxRect.height : (enemy?.radius || 16) * 2;
  const baseRadius = Math.max(12, hitboxWidth * 0.5);
  const topOffset = hitboxRect ? hitboxRect.y - (enemy?.y || 0) : -(hitboxHeight * 0.5);
  return {
    radiusX: baseRadius * 1.08,
    radiusY: baseRadius * 0.24,
    offsetY: topOffset + hitboxHeight * 0.08 + 35,
    lift: Math.max(6, baseRadius * 0.46),
  };
}

function cloneTormentorOrbiterVisualConfig(enemy) {
  const visualConfig = enemy?.orbiterVisual || enemy?.config?.orbiterVisual || null;
  if (!visualConfig || typeof visualConfig !== "object") return null;
  return JSON.parse(JSON.stringify(visualConfig));
}

function getTormentorOrbiterSpawnType(enemy) {
  const configuredType = enemy?.orbiterSpawnType || enemy?.config?.orbiterSpawnType || null;
  return typeof configuredType === "string" && configuredType.trim()
    ? configuredType.trim()
    : "tormentorFlame";
}

function assignTormentorFlameToOrbit(enemy, flame, slotIndex) {
  if (!enemy || !flame) return;
  const seedAngle =
    typeof enemy.tormentorFlameSeedAngle === "number"
      ? enemy.tormentorFlameSeedAngle
      : (enemy.tormentorFlameSeedAngle = Math.random() * Math.PI * 2);
  const angle = seedAngle + (Math.PI * 2 * slotIndex) / TORMENTOR_FLAME_MAX;
  const settings = getTormentorFlameOrbitSettings(enemy);
  flame._orbiting = true;
  flame.orbitParent = enemy;
  flame.orbitSlotIndex = slotIndex;
  flame.orbitAngle = angle;
  flame.orbitSpeed = TORMENTOR_FLAME_ORBIT_SPEED;
  flame.orbitRadiusX = settings.radiusX;
  flame.orbitRadiusY = settings.radiusY;
  flame.orbitOffsetY = settings.offsetY;
  flame.orbitLift = settings.lift;
  flame.orbitScaleMin = TORMENTOR_FLAME_ORBIT_SCALE_MIN;
  flame.orbitScaleMax = TORMENTOR_FLAME_ORBIT_SCALE_MAX;
  flame.tormentorOrbitBound = true;
  flame.tormentorReleasedOnDeath = false;
  flame.orbiterVisual = cloneTormentorOrbiterVisualConfig(enemy);
  flame.spawnOffscreenTimer = 0;
  flame.ignoreEntityCollisions = true;
  flame.ignoreWorldBounds = true;
  flame.touchCooldown = Infinity;
  flame.attackTimer = 0;
  if (flame.animator) {
    flame.state = "walk";
    flame.animator.play("walk");
  }
}

function setTormentorFlameReleasedState(flame, { releasedOnDeath = false } = {}) {
  if (!flame) return;
  flame._orbiting = false;
  flame.orbitParent = null;
  flame.tormentorOrbitBound = false;
  flame.tormentorReleasedOnDeath = releasedOnDeath;
  flame.touchCooldown = 0;
  flame.ignoreEntityCollisions = false;
  flame.ignoreWorldBounds = false;
  flame.attackTimer = 0;
  if (flame.animator) {
    flame.state = "walk";
    flame.animator.play("walk");
    if (flame.config?.scale) {
      flame.animator.scale = flame.config.scale;
    }
  }
}

function releaseTormentorFlame(flame) {
  setTormentorFlameReleasedState(flame, { releasedOnDeath: false });
}

function releaseTormentorFlameOnOwnerDeath(flame) {
  setTormentorFlameReleasedState(flame, { releasedOnDeath: true });
}

if (typeof window !== "undefined") {
  window.releaseTormentorFlameOnOwnerDeath = releaseTormentorFlameOnOwnerDeath;
}

function launchTormentorFlame(flame, owner, target) {
  if (!flame) return;
  releaseTormentorFlame(flame);
  const originX = Number.isFinite(owner?.x) ? owner.x : flame.x;
  const originY = Number.isFinite(owner?.y) ? owner.y : flame.y;
  flame.x = originX;
  flame.y = originY;
  let dirX = 0;
  let dirY = 1;
  if (target && Number.isFinite(target.x) && Number.isFinite(target.y)) {
    dirX = target.x - originX;
    dirY = target.y - originY;
  } else if (Number.isFinite(owner?.facingX) || Number.isFinite(owner?.facingY)) {
    dirX = owner?.facingX || 0;
    dirY = owner?.facingY || 1;
  }
  const dir =
    typeof normalizeVector === "function"
      ? normalizeVector(dirX, dirY)
      : (() => {
          const length = Math.hypot(dirX, dirY) || 1;
          return { x: dirX / length, y: dirY / length };
        })();
  const vx = dir.x * TORMENTOR_FLAME_THROW_SPEED;
  const vy = dir.y * TORMENTOR_FLAME_THROW_SPEED;
  flame.scatterVx = vx;
  flame.scatterVy = vy;
  flame.scatterTimer = Math.max(flame.scatterTimer || 0, TORMENTOR_FLAME_THROW_DURATION);
  flame.scatterDuration = Math.max(
    flame.scatterDuration || 0,
    TORMENTOR_FLAME_THROW_DURATION,
  );
  flame.knockbackVx = vx;
  flame.knockbackVy = vy;
  flame.knockbackTimer = Math.max(
    flame.knockbackTimer || 0,
    TORMENTOR_FLAME_THROW_DURATION,
  );
  flame.knockbackDuration = Math.max(
    flame.knockbackDuration || 0,
    TORMENTOR_FLAME_THROW_DURATION,
  );
  flame.touchCooldown = Math.max(
    flame.touchCooldown || 0,
    TORMENTOR_FLAME_THROW_TOUCH_DELAY,
  );
  if (typeof flame.updateFacing === "function") {
    flame.updateFacing(dir.x, dir.y);
  }
}

function launchNextTormentorFlame(enemy, target) {
  if (!enemy || !Array.isArray(enemy.tormentorFlameSlots) || !enemy.tormentorFlameSlots.length) {
    return false;
  }
  const slots = enemy.tormentorFlameSlots;
  const startIndex = enemy.tormentorFlameLaunchIndex || 0;
  for (let offset = 0; offset < slots.length; offset += 1) {
    const idx = (startIndex + offset) % slots.length;
    const flame = slots[idx];
    if (flame && flame._orbiting && flame.orbitParent === enemy) {
      launchTormentorFlame(flame, enemy, target);
      enemy.tormentorFlameLaunchIndex = (idx + 1) % slots.length;
      slots[idx] = null;
      return true;
    }
  }
  return false;
}

function updateTormentorFlames(enemy, dt) {
  if (!enemy || enemy.dead || enemy.state === "death") return;
  if (!enemy.tormentorFlameSlots) {
    enemy.tormentorFlameSlots = new Array(TORMENTOR_FLAME_MAX).fill(null);
    enemy.tormentorFlameRespawnTimer = TORMENTOR_FLAME_RESPAWN_INTERVAL;
    enemy.tormentorFlameLaunchIndex = 0;
    const orbiterSpawnType = getTormentorOrbiterSpawnType(enemy);
    for (let i = 0; i < TORMENTOR_FLAME_MAX; i += 1) {
      const flame = spawnEnemyOfType(
        orbiterSpawnType,
        { x: enemy.x, y: enemy.y },
        { applyCameraShake: false, skipSpawnEffects: true },
      );
      if (!flame) continue;
      assignTormentorFlameToOrbit(enemy, flame, i);
      enemy.tormentorFlameSlots[i] = flame;
    }
  }

  for (let i = 0; i < enemy.tormentorFlameSlots.length; i += 1) {
    const flame = enemy.tormentorFlameSlots[i];
    if (!flame || flame.dead || flame.state === "death") {
      enemy.tormentorFlameSlots[i] = null;
      continue;
    }
    if (!flame._orbiting || flame.orbitParent !== enemy) {
      enemy.tormentorFlameSlots[i] = null;
    }
  }

  enemy.tormentorFlameRespawnTimer = Math.max(
    0,
    (enemy.tormentorFlameRespawnTimer || 0) - dt,
  );
  if (enemy.tormentorFlameRespawnTimer <= 0) {
    const emptyIndex = enemy.tormentorFlameSlots.findIndex((slot) => !slot);
    if (emptyIndex !== -1) {
      const orbiterSpawnType = getTormentorOrbiterSpawnType(enemy);
      const flame = spawnEnemyOfType(
        orbiterSpawnType,
        { x: enemy.x, y: enemy.y },
        { applyCameraShake: false, skipSpawnEffects: true },
      );
      if (flame) {
        assignTormentorFlameToOrbit(enemy, flame, emptyIndex);
        enemy.tormentorFlameSlots[emptyIndex] = flame;
      }
    }
    enemy.tormentorFlameRespawnTimer = TORMENTOR_FLAME_RESPAWN_INTERVAL;
  }

  const hasOrbitFlames = enemy.tormentorFlameSlots.some(
    (flame) => flame && flame._orbiting && flame.orbitParent === enemy,
  );
  if (
    hasOrbitFlames &&
    enemy.attackTimer <= 0 &&
    enemy.state !== "hurt" &&
    enemy.state !== "attack"
  ) {
    const target = typeof enemy.acquireTarget === "function" ? enemy.acquireTarget() : null;
    if (target) {
      const dx = target.x - enemy.x;
      const dy = target.y - enemy.y;
      const distance = Math.hypot(dx, dy);
      const targetRadius = target === player ? (player?.radius || 0) : target.radius || NPC_RADIUS;
      const desiredRange = enemy.desiredRange || enemy.config?.attackRange || 180;
      const rangeBuffer = Math.max(0, targetRadius * 0.5);
      if (distance <= desiredRange * 1.1 + rangeBuffer) {
        enemy.state = "attack";
        enemy.animator?.play("attack", { restart: true, loop: false });
        enemy.attackTimer = enemy.projectileCooldown || enemy.config?.attackCooldown || 1.5;
        launchNextTormentorFlame(enemy, target);
        enemy.tormentorFlameAttackLatch = true;
      }
    }
  }

  if (enemy.state === "attack") {
    if (!enemy.tormentorFlameAttackLatch) {
      const target = typeof enemy.acquireTarget === "function" ? enemy.acquireTarget() : null;
      launchNextTormentorFlame(enemy, target);
      enemy.tormentorFlameAttackLatch = true;
    }
  } else {
    enemy.tormentorFlameAttackLatch = false;
  }
}

function updateEnemiesAndEntities(dt) {
  enemies.forEach((enemy) => {
    const enemyDt = consumeEntityMeleeHitstopDt(enemy, dt);
    enemy.update(enemyDt);
    if (enemy.type === "miniDemonTormentor") {
      updateTormentorFlames(enemy, enemyDt);
    }
    if (enemy._orbiting && enemy.orbitParent) {
      enemy.spawnOffscreenTimer = 0;
      return;
    }
    enemy.spawnOffscreenTimer = Math.max(0, (enemy.spawnOffscreenTimer || 0) - enemyDt);
    if (enemy.spawnOffscreenTimer <= 0) {
      enemy.ignoreWorldBounds = false;
      enemy.spawnPushGrace = Math.max(enemy.spawnPushGrace || 0, 0.4);
    }
    enemy.touchCooldown = Math.max(0, (enemy.touchCooldown || 0) - enemyDt);
    if (enemy.spawnOffscreenTimer > 0) {
      return;
    }
    enemy.spawnPushGrace = Math.max(0, (enemy.spawnPushGrace || 0) - enemyDt);
    if (enemyDt <= 0) {
      return;
    }
    applyEnemyTouchDamage(enemy);
    resolveEntityCollisions(enemy, [player], { allowPush: true, overlapScale: 0.6 });
    resolveEntityCollisions(enemy, enemies, { allowPush: true, overlapScale: 0.85 });
    resolveEntityObstacles(enemy);
    clampEntityToBounds(enemy);
  });
}

function processDeadEnemies() {
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    if (!enemy.dead) continue;

    if (enemy.type === "miniDemoness" && !enemy.batBurstSpawned) {
      enemy.batBurstSpawned = true;
      const smokeScale = Math.max(0.9, (enemy.radius || 24) / 24);
      if (typeof spawnSmokeEffect === "function") {
        spawnSmokeEffect(enemy.x, enemy.y, smokeScale);
      }
      for (let b = 0; b < BAT_SPAWN_COUNT; b += 1) {
        const angle = (Math.PI * 2 * b) / BAT_SPAWN_COUNT + Math.random() * 0.35;
        const spawnPos = {
          x: enemy.x + Math.cos(angle) * 12,
          y: enemy.y + Math.sin(angle) * 12,
        };
        const bat = spawnEnemyOfType("bat", spawnPos, { applyCameraShake: false });
        if (bat) {
          const speed = (bat.config?.speed || 120) * BAT_SCATTER_SPEED_MULTIPLIER;
          bat.scatterTimer = BAT_SCATTER_DURATION;
          bat.scatterVx = Math.cos(angle) * speed;
          bat.scatterVy = Math.sin(angle) * speed;
        }
      }
    }

    const killedByPrayer = Boolean(enemy.killedByPrayerBomb);
    if (!killedByPrayer && player && typeof player.addPrayerCharge === "function") {
      const modifier = PRAYER_BOMB_CHARGE_TYPE_MODIFIERS[enemy.type] ?? 1;
      const formation = getFormationBonuses();
      const chargeScale = 1 + Math.max(0, Number(formation?.prayerChargeGain) || 0);
      const chargeAmount = PRAYER_BOMB_CHARGE_PER_KILL * modifier * chargeScale;
      if (chargeAmount > 0) player.addPrayerCharge(chargeAmount);
    }
    if (enemy.killedByPrayerBomb) {
      delete enemy.killedByPrayerBomb;
    }

    const skipFaithReward = NPC_FAITH_KILL_REWARD_EXCLUSIONS.has(enemy.type);
    if (!skipFaithReward) {
      try {
        const faithPerNpc =
          typeof devTools?.npcFaithPerEnemy === "number"
            ? devTools.npcFaithPerEnemy
            : NPC_FAITH_PER_ENEMY_KILL;
        if (faithPerNpc && npcs && npcs.length) {
          for (const npc of npcs) {
            if (!npc || !npc.active || npc.departed) continue;
            if (typeof npc.faith === "number") {
              const maxFaith = npc.maxFaith || NPC_MAX_FAITH;
              if (npc.faith <= 0) continue;
              if (npc.faith >= maxFaith) continue;
            }
            npc.receiveFaith(faithPerNpc);
          }
        }
      } catch (e) {}
    }

    lastEnemyDeathPosition = { x: enemy.x, y: enemy.y };
    maybeDropGraceFromEnemy(enemy);
    enemies.splice(i, 1);
  }
}

function processProjectileCollisions(dt) {
  projectiles.forEach((projectile) => projectile.update(dt));

  for (const projectile of projectiles) {
    if (projectile.dead) continue;
    if (projectile.visualOnly) continue;

    if (projectile.friendly) {
      // Friendly projectiles hitting enemies
      for (const enemy of enemies) {
        if (enemy.dead || enemy.state === "death") continue;
        if (projectile.hitEntities.has(enemy)) continue;
        if (!projectile.hitTest(enemy)) continue;
        projectile.hitEntities.add(enemy);

        if (projectile.type === "wisdom_missle") {
          detonateWisdomMissleProjectile(projectile);
          break;
        }

        if (projectile.type === "faith_cannon") {
          detonateFaithCannonProjectile(projectile, { endOfRange: false });
          break;
        }

        const prevHealth = enemy.health;
        const projectileDamage = projectile.getDamage();
        const damageType =
          projectile.damageType || (projectile.isDivineShot ? "charged" : "projectile");
        const hitX = Number.isFinite(projectile.x) ? projectile.x : enemy.x;
        const hitY = Number.isFinite(projectile.y) ? projectile.y : enemy.y;
        const shouldDeflect = isArmoredProjectileDeflectTarget(enemy, projectile, damageType);
        const meleeAttackState = projectile.isDivineShot ? window._meleeAttackState : null;
        const counterHit = projectile.isDivineShot
          ? getCounterHitResult(enemy, projectileDamage, meleeAttackState)
          : { damage: projectileDamage, damageText: null };
        enemy.takeDamage(counterHit.damage, {
          damageType,
          damageText: counterHit.damageText,
          ignoreProjectileResistance: projectile.ignoreProjectileResistance === true,
        });
        if (projectile.source?.isPlayer) {
          registerProjectileComboHit(enemy, counterHit.damage, projectile);
          if (projectile.isDivineShot && meleeAttackState) {
            applyMeleeHitstop(enemy, meleeAttackState, counterHit);
            registerPunishComboDamage(enemy, counterHit.damage, meleeAttackState);
            registerDivineShotComboHit(enemy, meleeAttackState);
          }
        }
        if (
          projectile.isDivineShot &&
          !shouldDeflect &&
          !enemy.dead &&
          enemy.state !== "death" &&
          Number.isFinite(enemy.health) &&
          enemy.health > 0
        ) {
          applyEnemyMeleeKnockback(enemy, hitX, hitY, MELEE_DAMAGE_KNOCKBACK);
        }

        if (shouldDeflect) {
          spawnArmoredProjectileDeflect(projectile, enemy, hitX, hitY);
        } else if (
          projectile.type === "arrow" ||
          projectile.type === "fire" ||
          projectile.type === "faith_cannon"
        ) {
          spawnEnemyHitEffect(enemy, hitX, hitY, { damageType });
        }
        if (enemy.health > 0 && enemy.type !== "tormentorFlame") {
          const puffRadius = Math.max(24, getEnemyHitboxRadius(enemy)) * 0.6;
          const center = getEnemyHitboxCenter(enemy);
          spawnPuffEffect(center.x, center.y, puffRadius);
        }
        projectile.onHit(enemy);
        if (shouldDeflect) projectile.dead = true;
        if (projectile.dead) break;
      }

      if (projectile.dead) continue;

      // Friendly projectiles hitting boss
      if (!projectile.dead && activeBoss && !activeBoss.dead && !activeBoss.defeated) {
        const _multiBoss = projectile.maxBossHits > 1;
        const _canHitBoss = _multiBoss
          ? projectile.bossHitCount < projectile.maxBossHits && projectile.bossHitTimer <= 0
          : !projectile.hitEntities.has(activeBoss);
        if (_canHitBoss && projectile.hitTest(activeBoss)) {
          if (_multiBoss) {
            projectile.bossHitCount += 1;
            projectile.bossHitTimer = projectile.bossHitCooldown;
            if (projectile.bossHitCount >= projectile.maxBossHits) projectile.hitEntities.add(activeBoss);
          } else {
            projectile.hitEntities.add(activeBoss);
          }
          if (projectile.type === "wisdom_missle") {
            detonateWisdomMissleProjectile(projectile);
          } else if (projectile.type === "faith_cannon") {
            detonateFaithCannonProjectile(projectile, { endOfRange: false });
          } else {
            const hitX = Number.isFinite(projectile.x) ? projectile.x : activeBoss.x;
            const hitY = Number.isFinite(projectile.y) ? projectile.y : activeBoss.y;
            const damageType =
              projectile.damageType || (projectile.isDivineShot ? "charged" : "projectile");
            const bossDamage = projectile.getDamage();
            const shouldDeflect = isArmoredProjectileDeflectTarget(activeBoss, projectile, damageType);
            const meleeAttackState = projectile.isDivineShot ? window._meleeAttackState : null;
            const counterHit = projectile.isDivineShot
              ? getCounterHitResult(activeBoss, bossDamage, meleeAttackState)
              : { damage: bossDamage, damageText: null };
            activeBoss.takeDamage(counterHit.damage, {
              hitX,
              hitY,
              damageType,
              skipImpactEffect: true,
              damageText: counterHit.damageText,
              ignoreProjectileResistance: projectile.ignoreProjectileResistance === true,
            });
            if (projectile.source?.isPlayer) {
              registerProjectileComboHit(activeBoss, counterHit.damage, projectile);
              if (projectile.isDivineShot && meleeAttackState) {
                applyMeleeHitstop(activeBoss, meleeAttackState, counterHit);
                registerPunishComboDamage(activeBoss, counterHit.damage, meleeAttackState);
                registerDivineShotComboHit(activeBoss, meleeAttackState);
              }
            }
            if (
              projectile.isDivineShot &&
              !shouldDeflect &&
              !activeBoss.dead &&
              !activeBoss.defeated &&
              Number.isFinite(activeBoss.health) &&
              activeBoss.health > 0 &&
              typeof activeBoss.knockbackVx === "number"
            ) {
              applyEnemyMeleeKnockback(activeBoss, hitX, hitY, MELEE_DAMAGE_KNOCKBACK);
            }
            if (shouldDeflect) {
              spawnArmoredProjectileDeflect(projectile, activeBoss, hitX, hitY);
            } else if (
              projectile.type === "arrow" ||
              projectile.type === "fire" ||
              projectile.type === "faith_cannon"
            ) {
              spawnFlashEffect(hitX, hitY);
            }
            projectile.onHit(activeBoss);
            if (shouldDeflect) projectile.dead = true;
            if (!projectile.pierce) projectile.dead = true;
          }
        }
      }
    } else {
      if (projectile.collisionDisabled) {
        continue;
      }
      // Hostile projectiles hitting player
      if (player && player.state !== "death" && projectile.hitTest(player)) {
        if (player.invulnerableTimer > 0) {
          projectile.dead = true;
        } else if (player.shieldTimer > 0) {
          projectile.dead = true;
          spawnFlashEffect(player.x, player.y - player.radius / 2);
        } else {
          const damage = Math.max(1, Math.round(projectile.getDamage() || 1));
          player.takeDamage(damage);
          projectile.onHit(player);
          projectile.dead = true;
        }
        continue;
      }

      // Hostile projectiles hitting NPCs
      if (!projectile.dead && npcs.length) {
        for (const npc of npcs) {
          if (projectile.dead) break;
          if (!npc.active || npc.departed) continue;
          if (!projectile.hitTest(npc)) continue;
          if (!projectile.hitEntities.has(npc)) {
            projectile.hitEntities.add(npc);
            const damage = Math.max(1, Math.round(projectile.getDamage() || 1));
            if (typeof npc.sufferAttack === "function") {
              npc.sufferAttack(damage, { sourceType: projectile.source?.type });
            }
            projectile.onHit(npc);
          }
          projectile.dead = true;
        }
      }
    }
  }

  const meleeAttackState = window._meleeAttackState;
  if (player && meleeAttackState) {
    const meleeActive =
      meleeAttackState.swooshTimer > 0 ||
      meleeAttackState.spinTimer > 0 ||
      meleeAttackState.isRushing ||
      meleeAttackState.rushDamageEnabled;
    if (meleeActive) {
      const dirVec =
        (meleeAttackState.isRushing && meleeAttackState.rushDir) ||
        meleeAttackState.swooshDir ||
        window.Input?.lastMovementDirection ||
        { x: 1, y: 0 };
      const len = Math.hypot(dirVec.x, dirVec.y) || 1;
      const normalized = { x: dirVec.x / len, y: dirVec.y / len };
      const swooshAngle = Math.atan2(normalized.y, normalized.x);
      const swooshSpread = Math.PI * 0.35 * MELEE_SWOOSH_ARC_SCALE;
      const meleeDeflectDamage = getPlayerProjectileDeflectDamage(meleeAttackState);
      for (const projectile of projectiles) {
        const bossProjectile = isBossProjectile(projectile);
        if (
          projectile.dead ||
          projectile.visualOnly ||
          (projectile.friendly && !bossProjectile)
        ) continue;
        const dx = projectile.x - player.x;
        const dy = projectile.y - player.y;
        const dist = Math.hypot(dx, dy);
        let projectileDestroyed = false;
        if (dist <= MELEE_CLOSE_RANGE) {
          projectileDestroyed =
            projectile.maxDurability > 0
              ? applyProjectileDurabilityDamage(projectile, meleeDeflectDamage)
              : ((projectile.dead = true), true);
        } else if (meleeAttackState.spinTimer > 0) {
          if (dist <= MELEE_SWING_RANGE) {
            projectileDestroyed =
              projectile.maxDurability > 0
                ? applyProjectileDurabilityDamage(projectile, meleeDeflectDamage)
                : ((projectile.dead = true), true);
          }
        } else if (dist <= MELEE_SWING_RANGE) {
          const enemyAngle = Math.atan2(dy, dx);
          let angleDiff = enemyAngle - swooshAngle;
          while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
          while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
          if (Math.abs(angleDiff) <= swooshSpread) {
            projectileDestroyed =
              projectile.maxDurability > 0
                ? applyProjectileDurabilityDamage(projectile, meleeDeflectDamage)
                : ((projectile.dead = true), true);
          }
        }
        if (projectileDestroyed || projectile.dead) {
          if (bossProjectile && projectile.onExpire && !projectile.onExpireTriggered) {
            projectile.onExpireTriggered = true;
            projectile.onExpire(projectile);
          }
          spawnImpactEffect(projectile.x, projectile.y);
          spawnFlashEffect(projectile.x, projectile.y);
        }
      }
    }
  }
}

function processProjectileClashing() {
  const friendlyProjectiles = projectiles.filter(
    (proj) => proj.friendly && !proj.dead && !proj.visualOnly,
  );
  const hostileProjectiles = projectiles.filter(
    (proj) => !proj.friendly && !proj.dead && !proj.visualOnly,
  );

  for (const friendly of friendlyProjectiles) {
    if (friendly.dead) continue;
    for (const hostile of hostileProjectiles) {
      if (hostile.dead) continue;
      if (!projectilesIntersect(friendly, hostile)) continue;

      const friendlyPriority = friendly.priority ?? 0;
      const hostilePriority = hostile.priority ?? 0;
      let friendlyDies = false;
      let hostileDies = false;
      const friendlyFromPlayer = Boolean(friendly.source === player);
      const hostileIsBoss = isBossProjectile(hostile);

      if (friendly.type === "word_of_god") {
        hostileDies = hostile.maxDurability > 0
          ? applyProjectileDurabilityDamage(hostile, friendly.getDamage())
          : true;
        friendlyDies = false;
      } else if (friendly.type === "fire" && friendly.friendly) {
        hostileDies = hostile.maxDurability > 0
          ? applyProjectileDurabilityDamage(hostile, friendly.getDamage())
          : true;
        friendlyDies = false;
      } else if (hostileIsBoss && friendlyFromPlayer) {
        hostileDies = hostile.maxDurability > 0
          ? applyProjectileDurabilityDamage(hostile, friendly.getDamage())
          : false;
        friendlyDies = true;
      } else if (friendlyPriority > hostilePriority) {
        hostileDies = hostile.maxDurability > 0
          ? applyProjectileDurabilityDamage(hostile, friendly.getDamage())
          : true;
      } else if (friendlyPriority < hostilePriority) {
        friendlyDies = true;
      } else {
        friendlyDies = true;
        hostileDies = hostile.maxDurability > 0
          ? applyProjectileDurabilityDamage(hostile, friendly.getDamage())
          : true;
      }
      if (hostileDies && hostile.type === "miniTrident") {
        spawnFlashEffect(hostile.x, hostile.y);
      }

      if (hostileDies) hostile.dead = true;
      if (friendlyDies) friendly.dead = true;

      const hitX = (friendly.x + hostile.x) / 2;
      const hitY = (friendly.y + hostile.y) / 2;
      spawnImpactEffect(hitX, hitY);
      spawnFlashEffect(hitX, hitY);
      if (typeof playEnemyHitSfx === "function") {
        playEnemyHitSfx(0.35);
      }
      break;
    }
  }
}

function cleanupDeadProjectiles() {
  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    if (projectiles[i].dead) {
      projectiles.splice(i, 1);
    }
  }
}

// ============================================================================
// MELEE ATTACK SYSTEM - Helper Functions
// ============================================================================

function getMeleeAttackDirection() {
  const input = window.Input;
  if (!input || !player) return { x: 1, y: 0 };
  let dir = input.movementDirection || { x: 0, y: 0 };
  if (dir.x === 0 && dir.y === 0) {
    dir = input.lastMovementDirection || { x: 1, y: 0 };
  }
  if (dir.x === 0 && dir.y === 0) {
    const aim = player.aim || { x: 1, y: 0 };
    dir = { x: aim.x, y: aim.y };
  }
  return normalizeVector(dir.x, dir.y);
}

function getSpinAttackDirection() {
  if (!player) return { x: 1, y: 0 };
  const aimDir =
    typeof player.getAimDirection === "function"
      ? player.getAimDirection()
      : normalizeVector(player.aim?.x || 0, player.aim?.y || 0);
  if (aimDir.x !== 0 || aimDir.y !== 0) {
    return normalizeVector(aimDir.x, aimDir.y);
  }
  return getMeleeAttackDirection();
}

function getDashButtonDirection() {
  const input = window.Input;
  if (!input || !player) return { x: 1, y: 0 };
  let dir = input.movementDirection || { x: 0, y: 0 };
  if (dir.x === 0 && dir.y === 0) {
    dir = input.lastMovementDirection || { x: 1, y: 0 };
  }
  if (dir.x === 0 && dir.y === 0) {
    const aim = player.aim || { x: 1, y: 0 };
    dir = { x: aim.x, y: aim.y };
  }
  return normalizeVector(dir.x, dir.y);
}

function getComboLabelFontSize(hits) {
  const comboHits = Math.max(2, Math.round(hits || 0));
  if (comboHits < 10) return 32;
  const tier = Math.floor(comboHits / 10);
  return 38 + Math.max(0, tier - 1) * 6;
}

function getComboLabelColor(hits) {
  const comboHits = Math.max(2, Math.round(hits || 0));
  const tier = Math.floor(comboHits / 10);
  if (tier >= 5) return "#FFF7F0";
  if (tier >= 4) return "#FFF0C9";
  if (tier >= 3) return "#FFE6A3";
  if (tier >= 2) return "#FFD982";
  if (tier >= 1) return "#FFF2B8";
  return "#E4D6B2";
}

function updateHudComboDisplay({ hits, damage, fontSize, color, durationMs }) {
  const now =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  const labelHits = Number.isFinite(hits) ? Math.max(2, Math.round(hits)) : 2;
  const damageValue = Number.isFinite(damage) ? Math.round(damage) : 0;
  const labelText = `${labelHits} Hit Combo`;
  hudComboDisplay = {
    labelText,
    color: color || "#FFF2B8",
    fontSize: fontSize || 32,
    updatedAt: now,
    expiresAt: now + (Number.isFinite(durationMs) ? durationMs : 1100),
  };
  if (typeof window !== "undefined") {
    window.__hudComboDisplay = hudComboDisplay;
  }
}

function withAlpha(hexColor, alpha) {
  if (!hexColor || hexColor[0] !== "#" || hexColor.length !== 7) return hexColor;
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  if (![r, g, b].every(Number.isFinite)) return hexColor;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function updatePrayerBombComboDisplay() {
  if (!prayerBombComboState.active) return;
  const hits = Math.max(1, Math.round(prayerBombComboState.hits || 0));
  if (!Number.isFinite(prayerBombComboState.anchorX) || !Number.isFinite(prayerBombComboState.anchorY)) {
    prayerBombComboState.anchorX = cameraOffsetX + canvas.width / 2;
    prayerBombComboState.anchorY = canvas.height / 2;
  }
  const centerX = prayerBombComboState.anchorX;
  const centerY = prayerBombComboState.anchorY;
  const fontSize = getComboLabelFontSize(hits) * 2;
  const color = getComboLabelColor(hits);
  const labelText = `${formatNumberWithCommas(hits)} HIT\nCOMBO`;
  if (!prayerBombComboState.label) {
    const label = addFloatingTextAt(centerX, centerY, labelText, color, {
      speechBubble: false,
      vy: 0,
      life: 1.4,
      fontSize,
      fontWeight: "800",
      priority: 7,
      fadeDelay: 0,
      clampToScreen: true,
      persist: true,
    });
    if (label) {
      label.floorLayer = true;
      label.noStroke = true;
      label.floorPerspective = 0;
      label.floorRotate = 0;
      label.floorPitch = 0.35;
      label.floorShear = 0;
    }
    prayerBombComboState.label = label;
    return;
  }
  prayerBombComboState.label.text = labelText;
  prayerBombComboState.label.x = centerX;
  prayerBombComboState.label.y = centerY;
  prayerBombComboState.label.fontSize = fontSize;
  prayerBombComboState.label.color = color;
  prayerBombComboState.label.persist = true;
  prayerBombComboState.label.floorLayer = true;
  prayerBombComboState.label.noStroke = true;
  prayerBombComboState.label.floorPerspective = 0;
  prayerBombComboState.label.floorRotate = 0;
  prayerBombComboState.label.floorPitch = 0.35;
  prayerBombComboState.label.floorShear = 0;
}

function startPrayerBombCombo() {
  if (!prayerBombComboState.active) {
    prayerBombComboState.hits = 0;
    prayerBombComboState.label = null;
    prayerBombComboState.anchorX = null;
    prayerBombComboState.anchorY = null;
  }
  prayerBombComboState.active = true;
}

function endPrayerBombCombo() {
  if (!prayerBombComboState.active) return;
  const finalHits = Math.max(0, Math.round(prayerBombComboState.hits || 0));
  if (finalHits > 0 && levelManager?.recordPrayerBombComboContribution) {
    levelManager.recordPrayerBombComboContribution(finalHits);
  }
  if (prayerBombComboState.label) {
    prayerBombComboState.label.persist = false;
    prayerBombComboState.label.life = Math.min(prayerBombComboState.label.life || 4.5, 4.5);
    prayerBombComboState.label.fadeDelay = 3.0;
    prayerBombComboState.label.floorFlash = true;
  }
  prayerBombComboState.active = false;
  prayerBombComboState.hits = 0;
  prayerBombComboState.label = null;
  prayerBombComboState.anchorX = null;
  prayerBombComboState.anchorY = null;
}

function recordPrayerBombComboHits(count) {
  if (!prayerBombComboState.active) return;
  const addCount = Math.max(0, Math.round(count || 0));
  if (!addCount) return;
  prayerBombComboState.hits += addCount;
  updatePrayerBombComboDisplay();
  maybeUpdateMaxComboInTown(
    prayerBombComboState.hits,
    cameraOffsetX + canvas.width / 2,
    canvas.height / 2,
    { skipHudFly: true },
  );
}

function showPrayerBombBlastCombo(count, x, y) {
  const hits = Math.max(0, Math.round(count || 0));
  if (!hits) return;
  const fontSize = getComboLabelFontSize(hits) * 2;
  const color = getComboLabelColor(hits);
  const labelText = `${formatNumberWithCommas(hits)} HIT\nCOMBO`;
  const label = addFloatingTextAt(x, y, labelText, color, {
    speechBubble: false,
    vy: -28,
    life: 1.2,
    fontSize,
    fontWeight: "800",
    priority: 7,
    fadeDelay: 0,
    clampToScreen: true,
  });
  if (label) {
    label.floorLayer = true;
    label.noStroke = true;
    label.floorPerspective = 0;
    label.floorRotate = 0;
    label.floorPitch = 0.35;
    label.floorShear = 0;
  }
  maybeUpdateMaxComboInTown(hits, x, y, { skipHudFly: true });
}

function maybeUpdateMaxComboInTown(hits, x, y, options = {}) {
  const comboHits = Math.max(2, Math.round(hits || 0));
  if (!Number.isFinite(comboHits)) return;
  if (levelManager?.setBattleMaxCombo) {
    levelManager.setBattleMaxCombo(comboHits);
  }
  if (comboHits <= maxComboThisTown) return;
  maxComboThisTown = comboHits;
  // HUD fly effect disabled per design; keep max combo updated without animation.
}

function updateLiveComboText(state, target) {
  if (!state || !target || state.hits < 2) return;
  const label = `${Math.max(2, Math.round(state.hits))} Hit Combo`;
  const labelFontSize = getComboLabelFontSize(state.hits);
  const labelColor = getComboLabelColor(state.hits);
  maybeUpdateMaxComboInTown(state.hits, target.x, target.y);
  updateHudComboDisplay({
    hits: state.hits,
    damage: state.damage,
    fontSize: labelFontSize,
    color: labelColor,
    durationMs: COMBO_WINDOW_MS * 4,
  });
}

function finalizeComboState(state) {
  if (!state || state.hits < 2) return;
  updateHudComboDisplay({
    hits: state.hits,
    damage: state.damage,
    fontSize: getComboLabelFontSize(state.hits),
    color: getComboLabelColor(state.hits),
    durationMs: 800,
  });
}

const comboTracker = {
  state: null,
  flush(now) {
    if (!this.state) return;
    const timeNow =
      typeof now === "number"
        ? now
        : typeof performance !== "undefined" && typeof performance.now === "function"
          ? performance.now()
          : Date.now();
    const state = this.state;
    this.state = null;
    if (timeNow <= state.expiresAt) {
      finalizeComboState(state);
    } else {
      finalizeComboState(state);
    }
  },
  registerHit(target, damage, now) {
    if (!target || !Number.isFinite(damage) || damage <= 0) return;
    const timeNow =
      typeof now === "number"
        ? now
        : typeof performance !== "undefined" && typeof performance.now === "function"
          ? performance.now()
          : Date.now();
    let current =
      this.state && timeNow <= this.state.expiresAt
        ? this.state
        : {
            hits: 0,
            damage: 0,
            expiresAt: 0,
            killed: false,
            lastX: null,
            lastY: null,
          };
    // Directional gating removed: combos now accumulate regardless of projectile direction.
    current.hits += 1;
    current.damage += damage;
    current.lastX = Number.isFinite(target.x) ? target.x : current.lastX;
    current.lastY = Number.isFinite(target.y) ? target.y : current.lastY;
    if (
      target.dead ||
      target.state === "death" ||
      (Number.isFinite(target.health) && target.health <= 0)
    ) {
      current.killed = true;
    }
    current.expiresAt = timeNow + COMBO_WINDOW_MS;
    this.state = current;
    if (current.hits >= 2) {
      updateLiveComboText(current, target);
    }
  },
  update(now) {
    if (!this.state) return;
    const timeNow =
      typeof now === "number"
        ? now
        : typeof performance !== "undefined" && typeof performance.now === "function"
          ? performance.now()
          : Date.now();
    if (timeNow <= this.state.expiresAt) return;
    const state = this.state;
    this.state = null;
    finalizeComboState(state);
  },
};

function registerComboHit(target, damage) {
  if (prayerBombComboState.active && target) {
    recordPrayerBombComboHits(1);
  }
  if (!window.BattlechurchComboTrackerEnabled) return;
  comboTracker.registerHit(target, damage);
}

function registerProjectileComboHit(target, damage, projectile) {
  if (prayerBombComboState.active && target) {
    recordPrayerBombComboHits(1);
  }
  if (!window.BattlechurchComboTrackerEnabled) return;
  comboTracker.registerHit(target, damage);
}

function spawnGraceArcBurst(baseX, baseY, count, spread) {
  if (!Number.isFinite(baseX) || !Number.isFinite(baseY)) return;
  const burstCount = Math.max(0, Math.round(count || 0));
  if (!burstCount) return;
  const burstSpread = Number.isFinite(spread) ? spread : Math.min(80, 24 + burstCount * 8);
  for (let i = 0; i < burstCount; i += 1) {
    const spawnOffsetX = randomInRange(-burstSpread, burstSpread);
    const angle = randomInRange(-Math.PI * 1.15, -Math.PI * 0.05);
    const speed = randomInRange(160, 220);
    const horizontalBias = Math.sign(spawnOffsetX || 1) * randomInRange(25, 60);
    const vx = Math.cos(angle) * speed + horizontalBias;
    const vy = Math.sin(angle) * speed - randomInRange(320, 420);
    const floorJitter = randomInRange(-0.15, 0.15);
    const floorY = Math.max(
      HUD_HEIGHT + 24,
      Math.min(canvas.height - 24, baseY + baseY * floorJitter),
    );
    spawnGracePickup(
      baseX + spawnOffsetX,
      baseY + randomInRange(-burstSpread * 0.3, burstSpread * 0.3),
      {
        vx,
        vy,
        scatter: false,
        value: 1,
        useGravity: true,
        bounce: true,
        gravity: GRACE_PICKUP_GRAVITY * 2.2,
        floorY,
        bounceDamp: 0.55,
        airDrag: 0.985,
        disableAttraction: true,
      },
    );
  }
}

function spawnComboGraceBurst(target, hits, fallbackX, fallbackY, killedOnCombo = false) {
  const comboHits = Math.max(2, Math.round(hits || 0));
  const minPerHit = killedOnCombo ? 3 : 2;
  const maxPerHit = killedOnCombo ? 5 : 2;
  const minGems = comboHits * minPerHit;
  const maxGems = comboHits * maxPerHit;
  const gemCount = Math.max(minGems, randomInRange(minGems, maxGems));
  const baseX = Number.isFinite(target?.x) ? target.x : fallbackX;
  const baseY = Number.isFinite(target?.y) ? target.y : fallbackY;
  if (!Number.isFinite(baseX) || !Number.isFinite(baseY)) return;
  const spread = Math.min(140, 40 + comboHits * 12);
  spawnGraceArcBurst(baseX, baseY, gemCount, spread);
}

function applyProjectileSplashDamage(
  projectile,
  centerX,
  centerY,
  radius,
  damage,
  { skipBossImpact = false } = {},
) {
  if (!projectile) return;
  const fromPlayer = Boolean(projectile?.source?.isPlayer);
  const damageType = projectile.damageType || (projectile.isDivineShot ? "charged" : "projectile");
  enemies.forEach((enemy) => {
    if (enemy.dead || enemy.state === "death") return;
    const center = getEnemyHitboxCenter(enemy);
    const distance = Math.hypot(center.x - centerX, center.y - centerY);
    const threshold = radius + getEnemyHitboxRadius(enemy) * 0.6;
    if (distance <= threshold) {
      enemy.takeDamage(damage, { damageType });
      if (fromPlayer) {
        registerProjectileComboHit(enemy, damage, projectile);
      }
    }
  });
  if (activeBoss && !activeBoss.dead && !activeBoss.removed) {
    const distance = Math.hypot(activeBoss.x - centerX, activeBoss.y - centerY);
    const threshold = radius + (activeBoss.radius || 0) * 0.6;
    if (distance <= threshold) {
      activeBoss.takeDamage(damage, {
        hitX: centerX,
        hitY: centerY,
        damageType,
        skipImpactEffect: skipBossImpact,
      });
      if (fromPlayer) {
        registerProjectileComboHit(activeBoss, damage, projectile);
      }
    }
  }
}

function getHeldMovementDirection() {
  const input = window.Input;
  if (!input) return { x: 0, y: 0 };
  let x = 0;
  let y = 0;
  if (input.isActionActive?.("left")) x -= 1;
  if (input.isActionActive?.("right")) x += 1;
  if (input.isActionActive?.("up")) y -= 1;
  if (input.isActionActive?.("down")) y += 1;
  if (x === 0 && y === 0) return { x: 0, y: 0 };
  return normalizeVector(x, y);
}

function setSharedBButtonCooldown(duration) {
  const next = Math.max(
    Number(duration) || 0,
    playerDashState?.dashCooldown || 0,
    window._meleeAttackState?.rushCooldown || 0,
    window._meleeAttackState?.spinCooldown || 0,
  );
  if (playerDashState) playerDashState.dashCooldown = next;
  if (window._meleeAttackState) {
    window._meleeAttackState.rushCooldown = next;
    window._meleeAttackState.spinCooldown = next;
  }
}

function isSharedBButtonReady() {
  const current = Math.max(
    playerDashState?.dashCooldown || 0,
    window._meleeAttackState?.rushCooldown || 0,
    window._meleeAttackState?.spinCooldown || 0,
  );
  return current <= 0;
}

function updateSharedBButtonCooldown(dt) {
  const current = Math.max(
    playerDashState?.dashCooldown || 0,
    window._meleeAttackState?.rushCooldown || 0,
    window._meleeAttackState?.spinCooldown || 0,
  );
  if (current <= 0) return false;
  const next = Math.max(0, current - dt);
  if (playerDashState) playerDashState.dashCooldown = next;
  if (window._meleeAttackState) {
    window._meleeAttackState.rushCooldown = next;
    window._meleeAttackState.spinCooldown = next;
  }
  return next === 0;
}

function applyMeleeInvulnerability(meleeAttackState, type, duration) {
  if (!player || !meleeAttackState) return;
  const safeDuration = Math.max(0, Number(duration) || 0);
  if (safeDuration <= 0) return;
  player.invulnerableTimer = Math.max(player.invulnerableTimer || 0, safeDuration);
  if (type === "swoosh") {
    meleeAttackState.swooshShieldDebugTimer = Math.max(
      meleeAttackState.swooshShieldDebugTimer || 0,
      safeDuration,
    );
  } else if (type === "rush") {
    meleeAttackState.rushShieldDebugTimer = Math.max(
      meleeAttackState.rushShieldDebugTimer || 0,
      safeDuration,
    );
  }
}

function getDashSwooshInvulnerabilityDuration() {
  const dashRemaining =
    playerDashState && playerDashState.isDashing
      ? Math.max(
          0,
          (playerDashState.dashDistanceRemaining || 0) / Math.max(1, DASH_SPEED || 1),
        )
      : 0;
  return Math.max(MELEE_SWOOSH_INVULNERABILITY, dashRemaining + MELEE_SWOOSH_EXIT_INVULNERABILITY);
}

function tryStartDash(direction) {
  if (playerDashState.isDashing || playerDashState.dashCooldown > 0) return false;
  if (!direction || (direction.x === 0 && direction.y === 0)) return false;
  playerDashState.isDashing = true;
  playerDashState.isHolyDash = false;
  playerDashState.dashDir = direction;
  playerDashState.dashDistanceRemaining = DASH_DISTANCE;
  playerDashState.dashDustAccumulator = 0;
  setSharedBButtonCooldown(DASH_COOLDOWN);
  playDashSfx(0.9);
  return true;
}

function updateDashMovement(dt) {
  if (!playerDashState.isDashing || !player) return;

  const movement = Math.min(playerDashState.dashDistanceRemaining, DASH_SPEED * dt);
  player.x += playerDashState.dashDir.x * movement;
  player.y += playerDashState.dashDir.y * movement;
  resolveEntityObstacles(player);
  clampEntityToBounds(player);
  playerDashState.dashDistanceRemaining -= movement;
  playerDashState.dashDustAccumulator += movement;

  // Spawn trail effects along the path
  while (playerDashState.dashDustAccumulator >= DASH_DUST_SPACING) {
    playerDashState.dashDustAccumulator -= DASH_DUST_SPACING;
    if (playerDashState.isHolyDash) {
      spawnFlashEffect(player.x, player.y);
    } else {
      spawnPuffEffect(player.x, player.y, 20 * WORLD_SCALE);
    }
  }

  applyDashSlashTravelDamage(window._meleeAttackState);

  // End dash when distance complete
  if (playerDashState.dashDistanceRemaining <= 0) {
    playerDashState.isDashing = false;
    playerDashState.isHolyDash = false;
    if (window._meleeAttackState) {
      window._meleeAttackState.swooshDamageEnabled = false;
      window._meleeAttackState.swooshHitEntities = null;
    }
    setSharedBButtonCooldown(DASH_COOLDOWN);
  }
}

function applyRushDamageFromSwoosh(direction, meleeAttackState) {
  if (!meleeAttackState.rushDamageEnabled || !meleeAttackState.rushHitEntities) return;
  if (!player) return;
  meleeAttackState.currentAttackHitboxType = "rush";
  const dir = normalizeVector(direction.x, direction.y);
  const angle = Math.atan2(dir.y, dir.x);
  const hitboxRect = getPlayerRushHitboxLocalRect(player);
  if (!hitboxRect) return;
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  enemies.forEach((enemy) => {
    if (enemy.dead || enemy.state === "death") return;
    if (meleeAttackState.rushHitEntities.has(enemy)) return;
    const hitCenter = getEnemyHitboxCenter(enemy);
    const relX = hitCenter.x - player.x;
    const relY = hitCenter.y - player.y;
    const localX = relX * cos - relY * sin;
    const localY = relX * sin + relY * cos;
    const hit = circleIntersectsRect(localX, localY, 0, hitboxRect);
    if (!hit) return;
    meleeAttackState.rushHitEntities.add(enemy);
    const counterHit = getCounterHitResult(enemy, RUSH_DAMAGE, meleeAttackState);
    const damage = counterHit.damage;
    enemy.takeDamage(damage, { damageType: "charged", damageText: counterHit.damageText });
    applyMeleeHitstop(enemy, meleeAttackState, counterHit);
    registerPunishComboDamage(enemy, damage, meleeAttackState);
    registerMeleeComboHit(enemy, meleeAttackState);
    registerComboHit(enemy, damage);
    if (!enemy.dead && enemy.state !== "death") {
      applyEnemyMeleeKnockback(enemy, player.x, player.y, RUSH_PUSHBACK_STRENGTH);
    }
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (!enemy.dead && enemy.state === "hurt") {
      const meleeCancelActive =
        meleeAttackState.meleeCancelUntil &&
        now <= meleeAttackState.meleeCancelUntil &&
        (!meleeAttackState.meleeCancelTarget || meleeAttackState.meleeCancelTarget === enemy);
      meleeAttackState.rushComboDamage = meleeCancelActive
        ? meleeAttackState.meleeCancelDamage + damage
        : damage;
      meleeAttackState.rushComboActiveUntil = now + 450;
      meleeAttackState.rushComboShown = false;
      meleeAttackState.rushComboHits = meleeCancelActive ? 2 : 1;
      meleeAttackState.rushComboTarget = enemy;
      if (meleeCancelActive) {
        meleeAttackState.meleeCancelUntil = 0;
        meleeAttackState.meleeCancelTarget = null;
      }
    }
    if (
      !meleeAttackState.divineComboShown &&
      meleeAttackState.divineComboDamage > 0 &&
      meleeAttackState.divineComboActiveUntil &&
      now <= meleeAttackState.divineComboActiveUntil &&
      meleeAttackState.divineComboTarget === enemy
    ) {
      meleeAttackState.divineComboDamage += damage;
      meleeAttackState.divineComboActiveUntil = now + 450;
      meleeAttackState.divineComboTarget = enemy;
      meleeAttackState.divineComboHits = Math.max(2, (meleeAttackState.divineComboHits || 1) + 1);
    }
    spawnEnemyHitEffect(enemy);
    if (typeof playEnemyHitSfx === "function") {
      playEnemyHitSfx(0.6);
    }
  });
  if (activeBoss && !activeBoss.dead && !activeBoss.defeated && !activeBoss.removed) {
    if (!meleeAttackState.rushHitEntities.has(activeBoss)) {
      const hitCenter = getEnemyHitboxCenter(activeBoss);
      const relX = hitCenter.x - player.x;
      const relY = hitCenter.y - player.y;
      const localX = relX * cos - relY * sin;
      const localY = relX * sin + relY * cos;
      const hit = circleIntersectsRect(localX, localY, 0, hitboxRect);
      if (hit) {
        meleeAttackState.rushHitEntities.add(activeBoss);
        const counterHit = getCounterHitResult(activeBoss, RUSH_DAMAGE, meleeAttackState);
        const damage = counterHit.damage;
        activeBoss.takeDamage(damage, {
          hitX: activeBoss.x,
          hitY: activeBoss.y,
          damageType: "charged",
          damageText: counterHit.damageText,
        });
        applyMeleeHitstop(activeBoss, meleeAttackState, counterHit);
        registerPunishComboDamage(activeBoss, damage, meleeAttackState);
        registerMeleeComboHit(activeBoss, meleeAttackState);
        registerComboHit(activeBoss, damage);
        const now = typeof performance !== "undefined" ? performance.now() : Date.now();
        if (!activeBoss.dead && activeBoss.state === "hurt") {
          const meleeCancelActive =
            meleeAttackState.meleeCancelUntil &&
            now <= meleeAttackState.meleeCancelUntil &&
            (!meleeAttackState.meleeCancelTarget ||
              meleeAttackState.meleeCancelTarget === activeBoss);
          meleeAttackState.rushComboDamage = meleeCancelActive
            ? meleeAttackState.meleeCancelDamage + damage
            : damage;
          meleeAttackState.rushComboActiveUntil = now + 450;
          meleeAttackState.rushComboShown = false;
          meleeAttackState.rushComboHits = meleeCancelActive ? 2 : 1;
          meleeAttackState.rushComboTarget = activeBoss;
          if (meleeCancelActive) {
            meleeAttackState.meleeCancelUntil = 0;
            meleeAttackState.meleeCancelTarget = null;
          }
        }
        if (typeof activeBoss.knockbackVx === "number") {
          applyEnemyMeleeKnockback(activeBoss, player.x, player.y, RUSH_PUSHBACK_STRENGTH);
        }
        if (
          !meleeAttackState.divineComboShown &&
          meleeAttackState.divineComboDamage > 0 &&
          meleeAttackState.divineComboActiveUntil &&
          now <= meleeAttackState.divineComboActiveUntil &&
          meleeAttackState.divineComboTarget === activeBoss
        ) {
          meleeAttackState.divineComboDamage += damage;
          meleeAttackState.divineComboActiveUntil = now + 450;
          meleeAttackState.divineComboTarget = activeBoss;
          meleeAttackState.divineComboHits = Math.max(
            2,
            (meleeAttackState.divineComboHits || 1) + 1,
          );
        }
        const comboNow = now;
        spawnEnemyHitEffect(activeBoss);
        if (typeof playEnemyHitSfx === "function") {
          playEnemyHitSfx(0.6);
        }
      }
    }
  }
}

function updateRushMovement(dt, direction, meleeAttackState) {
  if (!meleeAttackState.isRushing || !player) return;

  applyMeleeInvulnerability(meleeAttackState, "rush", RUSH_EXIT_INVULNERABILITY);

  const startX = player.x;
  const startY = player.y;
  const movement = Math.min(meleeAttackState.rushDistanceRemaining, RUSH_SPEED * dt);
  player.x += direction.x * movement;
  player.y += direction.y * movement;
  resolveEntityObstacles(player);
  clampEntityToBounds(player);
  meleeAttackState.rushSegment = {
    x1: startX,
    y1: startY,
    x2: player.x,
    y2: player.y,
  };
  meleeAttackState.rushHitboxTimer = Math.max(
    meleeAttackState.rushHitboxTimer || 0,
    RUSH_HITBOX_DEBUG_DURATION,
  );
  applyRushDamageFromSwoosh(direction, meleeAttackState);
  meleeAttackState.rushDistanceRemaining -= movement;
  meleeAttackState.rushDustAccumulator += movement;

  while (meleeAttackState.rushDustAccumulator >= RUSH_DUST_SPACING) {
    meleeAttackState.rushDustAccumulator -= RUSH_DUST_SPACING;
    spawnPuffEffect(player.x, player.y + player.radius * 0.5, 18 * WORLD_SCALE);
  }

  if (meleeAttackState.rushDistanceRemaining <= 0) {
    meleeAttackState.isRushing = false;
    meleeAttackState.rushJustEnded = true;
    meleeAttackState.rushDamageEnabled = false;
    meleeAttackState.rushInvulnerable = false;
    meleeAttackState.rushHitEntities = null;
    meleeAttackState.projectileBlockTimer = MELEE_PROJECTILE_COOLDOWN_AFTER;
    meleeAttackState.cooldown = 0;
    meleeAttackState.rushLockTimer = 0;
  }
}

function applyEnemyMeleeKnockback(enemy, sourceX, sourceY, strength) {
  if (!enemy || enemy.dead || enemy.state === "death") return;
  const dx = enemy.x - sourceX;
  const dy = enemy.y - sourceY;
  const distance = Math.hypot(dx, dy);
  if (!distance) return;
  const nx = dx / distance;
  const ny = dy / distance;
  const knockDuration = 0.16;
  const knockStrength = strength * 6.0;
  const vx = nx * knockStrength;
  const vy = ny * knockStrength;
  const nudge = (typeof WORLD_SCALE === "number" ? WORLD_SCALE : 1) * 30;
  enemy.x += nx * nudge;
  enemy.y += ny * nudge;
  enemy.knockbackVx = vx;
  enemy.knockbackVy = vy;
  enemy.knockbackTimer = Math.max(enemy.knockbackTimer || 0, knockDuration);
  enemy.knockbackDuration = Math.max(enemy.knockbackDuration || 0, knockDuration);
  enemy.knockbackLift = Math.max(
    enemy.knockbackLift || 0,
    Math.min(28, Math.max(12, strength * 0.24)),
  );
  enemy.scatterVx = vx;
  enemy.scatterVy = vy;
  enemy.scatterTimer = Math.max(enemy.scatterTimer || 0, knockDuration);
  enemy.scatterDuration = Math.max(enemy.scatterDuration || 0, knockDuration);
}

function markCounterHitWindow(target, duration = COUNTER_HIT_WINDOW) {
  if (!target) return;
  const now =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  target.counterHitUntil = now + Math.max(0, duration) * 1000;
}

function clearPunishCounterState(meleeAttackState) {
  if (!meleeAttackState) return;
  meleeAttackState.punishCounterTarget = null;
  meleeAttackState.punishCounterExpiresAt = 0;
  meleeAttackState.punishCounterPrimed = false;
  meleeAttackState.punishCounterTextShown = false;
  meleeAttackState.punishComboDamage = 0;
  meleeAttackState.pendingCounterHitTarget = null;
  meleeAttackState.pendingCounterHitShowAt = 0;
  if (meleeAttackState.activeCounterHitKind === "punish") {
    clearActiveCounterHitText(meleeAttackState);
  }
}

function getMultiplierBonusLabel(multiplier) {
  const bonusPercent = Math.max(0, Math.round((Math.max(0, Number(multiplier) || 1) - 1) * 100));
  return `+${bonusPercent}%`;
}

function triggerPunishCounterText(target, meleeAttackState = null) {
  if (!target || !meleeAttackState) return;
  const now =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  meleeAttackState.activeCounterHitTarget = target;
  meleeAttackState.activeCounterHitKind = "punish";
  meleeAttackState.activeCounterHitUntil =
    now + Math.max(PUNISH_COUNTER_TEXT_LIFE, MELEE_COMBO_TEXT_LIFE) * 1000;
  updateMeleeComboLabel(meleeAttackState);
}

function triggerCounterHitText(target, meleeAttackState = null) {
  if (!target || !meleeAttackState) return;
  const now =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  meleeAttackState.activeCounterHitTarget = target;
  meleeAttackState.activeCounterHitKind = "counter";
  meleeAttackState.activeCounterHitUntil =
    now + Math.max(COUNTER_HIT_TEXT_LIFE, MELEE_COMBO_TEXT_LIFE) * 1000;
  updateMeleeComboLabel(meleeAttackState);
}

function clearActiveCounterHitText(meleeAttackState, target = null, immediate = false) {
  if (!meleeAttackState || !meleeAttackState.activeCounterHitTarget) return;
  if (target && meleeAttackState.activeCounterHitTarget !== target) return;
  meleeAttackState.activeCounterHitLabel = null;
  meleeAttackState.activeCounterHitTarget = null;
  meleeAttackState.activeCounterHitKind = null;
  meleeAttackState.activeCounterHitUntil = 0;
  if (!immediate) {
    updateMeleeComboLabel(meleeAttackState);
  }
}

function registerPunishComboDamage(target, damage, meleeAttackState) {
  if (!target || !meleeAttackState) return;
  const damageValue = Math.max(0, Math.round(damage || 0));
  if (!damageValue) return;
  if (meleeAttackState.punishCounterTarget !== target) return;
  const now =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  if (
    !Number.isFinite(meleeAttackState.punishCounterExpiresAt) ||
    now > meleeAttackState.punishCounterExpiresAt
  ) {
    clearPunishCounterState(meleeAttackState);
    return;
  }
  meleeAttackState.punishComboDamage =
    Math.max(0, Math.round(meleeAttackState.punishComboDamage || 0)) + damageValue;
}

function rewardMeleeGraceBurst(target, count, spread = null) {
  const gemCount = Math.max(0, Math.round(count || 0));
  if (!target || !gemCount) return;
  const baseX = Number.isFinite(target.x) ? target.x : null;
  const baseY = Number.isFinite(target.y) ? target.y : null;
  if (!Number.isFinite(baseX) || !Number.isFinite(baseY)) return;
  spawnGraceArcBurst(baseX, baseY, gemCount, spread);
}

function beginMeleeHitstopSequence(meleeAttackState) {
  if (!meleeAttackState) return;
  meleeAttackState.hitstopSequenceId = (meleeAttackState.hitstopSequenceId || 0) + 1;
  meleeAttackState.hitstopAppliedSequenceId = 0;
}

function consumeEntityMeleeHitstopDt(entity, dt) {
  if (!entity || !Number.isFinite(dt) || dt <= 0) return dt;
  const remaining = Number(entity.meleeHitstopTimer) || 0;
  if (remaining <= 0) return dt;
  entity.meleeHitstopTimer = Math.max(0, remaining - dt);
  return 0;
}

function applyMeleeHitstop(target, meleeAttackState, counterHit) {
  if (!target) return;
  if (
    meleeAttackState &&
    meleeAttackState.hitstopSequenceId &&
    meleeAttackState.hitstopAppliedSequenceId === meleeAttackState.hitstopSequenceId
  ) {
    return;
  }
  const now =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  const comboFollowUp = Boolean(
    meleeAttackState &&
      meleeAttackState.meleeComboTarget === target &&
      (meleeAttackState.meleeComboHits || 0) >= 1 &&
      Number.isFinite(meleeAttackState.meleeComboExpiresAt) &&
      now <= meleeAttackState.meleeComboExpiresAt,
  );
  let duration = comboFollowUp ? MELEE_COMBO_HITSTOP_DURATION : MELEE_HITSTOP_DURATION;
  let shake = comboFollowUp ? MELEE_COMBO_HITSTOP_SHAKE : MELEE_HITSTOP_SHAKE;
  if (counterHit?.isPunishCounter) {
    duration = MELEE_PUNISH_HITSTOP_DURATION;
    shake = MELEE_PUNISH_HITSTOP_SHAKE;
  } else if (counterHit?.isCounterHit) {
    duration = MELEE_COUNTER_HITSTOP_DURATION;
    shake = MELEE_COUNTER_HITSTOP_SHAKE;
  }
  target.meleeHitstopTimer = Math.max(Number(target.meleeHitstopTimer) || 0, duration);
  if (player && player !== target) {
    player.meleeHitstopTimer = Math.max(Number(player.meleeHitstopTimer) || 0, duration);
  }
  if (meleeAttackState && meleeAttackState.hitstopSequenceId) {
    meleeAttackState.hitstopAppliedSequenceId = meleeAttackState.hitstopSequenceId;
  }
  applyCameraShake(Math.max(0.08, duration * 2.5), shake);
}

function queueCounterHitText(target, meleeAttackState, delayMs = 110) {
  if (!target) return;
  if (!meleeAttackState) {
    triggerCounterHitText(target);
    return;
  }
  const now =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  meleeAttackState.pendingCounterHitTarget = target;
  meleeAttackState.pendingCounterHitShowAt = now + Math.max(0, delayMs);
}

function getCounterHitResult(target, baseDamage, meleeAttackState = null) {
  const damage = Math.max(0, Math.round(baseDamage || 0));
  if (!target || damage <= 0) return { damage, isCounterHit: false, damageText: null };
  const now =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  const punishActive =
    meleeAttackState &&
    meleeAttackState.punishCounterTarget === target &&
    Number.isFinite(meleeAttackState.punishCounterExpiresAt) &&
    now <= meleeAttackState.punishCounterExpiresAt;
  if (punishActive) {
    return {
      damage: Math.max(1, Math.round(damage * PUNISH_COUNTER_MULTIPLIER)),
      isCounterHit: true,
      isPunishCounter: true,
      damageText: {
        color: "#FFE7A1",
        offsetY: 8,
        fontWeight: "800",
        priority: 1,
      },
    };
  }
  const counterUntil = Number(target.counterHitUntil) || 0;
  if (counterUntil <= 0 || now > counterUntil) {
    return { damage, isCounterHit: false, damageText: null };
  }
  target.counterHitUntil = 0;
  if (meleeAttackState) {
    meleeAttackState.punishCounterTarget = target;
    meleeAttackState.punishCounterExpiresAt = now + COMBO_WINDOW_MS;
    meleeAttackState.punishCounterPrimed = true;
    meleeAttackState.punishCounterTextShown = false;
  }
  rewardMeleeGraceBurst(target, COUNTER_HIT_GRACE_GEMS, 48);
  queueCounterHitText(target, meleeAttackState);
  return {
    damage: Math.max(1, Math.round(damage * PUNISH_COUNTER_MULTIPLIER)),
    isCounterHit: true,
    isPunishCounter: false,
    damageText: {
      color: "#FFE7A1",
      offsetY: 8,
      fontWeight: "800",
      priority: 1,
    },
  };
}

function clearMeleeComboLabel(meleeAttackState) {
  if (!meleeAttackState) return;
  if (meleeAttackState.meleeComboLabel) {
    meleeAttackState.meleeComboLabel.persist = false;
    meleeAttackState.meleeComboLabel.life = Math.max(
      meleeAttackState.meleeComboLabel.life || 0,
      MELEE_COMBO_TEXT_LIFE,
    );
    meleeAttackState.meleeComboLabel.fadeDelay = 0;
  }
  meleeAttackState.meleeComboLabel = null;
}

function getMeleeCombatLabelConfig(meleeAttackState, target) {
  if (!meleeAttackState || !target) return null;
  const now =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  let specialText = "";
  let specialKind = null;
  if (
    meleeAttackState.activeCounterHitTarget === target &&
    Number.isFinite(meleeAttackState.activeCounterHitUntil) &&
    now <= meleeAttackState.activeCounterHitUntil
  ) {
    specialKind = meleeAttackState.activeCounterHitKind || "counter";
    specialText =
      specialKind === "punish"
        ? `Punish Counter ${getMultiplierBonusLabel(PUNISH_COUNTER_MULTIPLIER)}`
        : `Counter Hit ${getMultiplierBonusLabel(COUNTER_HIT_MULTIPLIER)}`;
  } else if (meleeAttackState.activeCounterHitTarget === target) {
    meleeAttackState.activeCounterHitTarget = null;
    meleeAttackState.activeCounterHitKind = null;
    meleeAttackState.activeCounterHitUntil = 0;
  }
  const hits = Math.max(0, Math.round(meleeAttackState.meleeComboHits || 0));
  const comboText = hits >= 2 ? `Combo ${hits}` : "";
  if (!specialText && !comboText) return null;
  const lines = [];
  if (specialText) lines.push(specialText);
  if (comboText) lines.push(comboText);
  const hitboxRect = getEnemyHitboxRect(target);
  const topAnchorOffset = hitboxRect
    ? hitboxRect.y - target.y
    : -(target.radius || target.config?.hitRadius || 24);
  const lineCount = lines.length;
  const verticalClearance = specialText ? 28 : 18;
  const stackedLineOffset = lineCount > 1 ? 24 : 0;
  return {
    text: lines.join("\n"),
    color:
      specialKind === "punish"
        ? "#FFD84F"
        : specialKind === "counter"
          ? "#FFE7A1"
          : "#FFE083",
    fontSize: specialText ? 22 : 20,
    fontWeight: specialKind === "punish" ? "900" : "800",
    offsetY: topAnchorOffset - 28 - verticalClearance - stackedLineOffset,
  };
}

function updateMeleeComboLabel(meleeAttackState) {
  if (!meleeAttackState) return;
  const comboTarget = meleeAttackState.meleeComboTarget;
  const specialTarget = meleeAttackState.activeCounterHitTarget;
  const target = comboTarget || specialTarget;
  if (!target) {
    clearMeleeComboLabel(meleeAttackState);
    return;
  }
  if (target.dead || target.state === "death" || target.removed) {
    const labelConfig = getMeleeCombatLabelConfig(meleeAttackState, target);
    if (meleeAttackState.meleeComboLabel && labelConfig) {
      meleeAttackState.meleeComboLabel.text = labelConfig.text;
      meleeAttackState.meleeComboLabel.color = labelConfig.color;
      meleeAttackState.meleeComboLabel.fontSize = labelConfig.fontSize;
      meleeAttackState.meleeComboLabel.fontWeight = labelConfig.fontWeight;
      meleeAttackState.meleeComboLabel.x = target.x;
      meleeAttackState.meleeComboLabel.y = target.y + labelConfig.offsetY;
      meleeAttackState.meleeComboLabel.entity = null;
      meleeAttackState.meleeComboLabel.offsetX = 0;
      meleeAttackState.meleeComboLabel.offsetY = 0;
      meleeAttackState.meleeComboLabel.persist = false;
      meleeAttackState.meleeComboLabel.fadeDelay = 0;
      meleeAttackState.meleeComboLabel.life = Math.max(
        meleeAttackState.meleeComboLabel.life || 0,
        MELEE_COMBO_TEXT_LIFE,
      );
      meleeAttackState.meleeComboLabel = null;
    } else {
      clearMeleeComboLabel(meleeAttackState);
    }
    if (meleeAttackState.punishCounterTarget === target) {
      clearPunishCounterState(meleeAttackState);
    }
    meleeAttackState.meleeComboTarget = null;
    meleeAttackState.meleeComboHits = 0;
    meleeAttackState.meleeComboExpiresAt = 0;
    return;
  }
  const labelConfig = getMeleeCombatLabelConfig(meleeAttackState, target);
  if (!labelConfig) {
    clearMeleeComboLabel(meleeAttackState);
    return;
  }
  const comboLabelY = target.y + labelConfig.offsetY;
  if (!meleeAttackState.meleeComboLabel) {
    meleeAttackState.meleeComboLabel = addFloatingTextAt(
      target.x,
      comboLabelY,
      labelConfig.text,
      labelConfig.color,
      {
        speechBubble: false,
        vy: 0,
        life: MELEE_COMBO_TEXT_LIFE,
        entity: target,
        offsetY: labelConfig.offsetY,
        fontSize: labelConfig.fontSize,
        fontWeight: labelConfig.fontWeight,
        priority: 6,
        persist: true,
      },
    );
    return;
  }
  meleeAttackState.meleeComboLabel.text = labelConfig.text;
  meleeAttackState.meleeComboLabel.x = target.x;
  meleeAttackState.meleeComboLabel.y = comboLabelY;
  meleeAttackState.meleeComboLabel.entity = target;
  meleeAttackState.meleeComboLabel.offsetY = labelConfig.offsetY;
  meleeAttackState.meleeComboLabel.color = labelConfig.color;
  meleeAttackState.meleeComboLabel.persist = true;
  meleeAttackState.meleeComboLabel.life = Math.max(
    meleeAttackState.meleeComboLabel.life || 0,
    MELEE_COMBO_TEXT_LIFE,
  );
  meleeAttackState.meleeComboLabel.fontSize = labelConfig.fontSize;
  meleeAttackState.meleeComboLabel.fontWeight = labelConfig.fontWeight;
}

function registerMeleeComboHit(target, meleeAttackState) {
  if (!target || !meleeAttackState) return;
  const now =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  const currentTarget = meleeAttackState.meleeComboTarget || null;
  const currentHits = Math.max(0, Math.round(meleeAttackState.meleeComboHits || 0));
  const comboWindowActive =
    Number.isFinite(meleeAttackState.meleeComboExpiresAt) &&
    now <= meleeAttackState.meleeComboExpiresAt;
  const sameTargetChainActive =
    currentTarget === target &&
    comboWindowActive;
  const swarmRetargetActive =
    currentTarget &&
    currentTarget !== target &&
    currentHits === 1 &&
    comboWindowActive;
  const chainActive = sameTargetChainActive || swarmRetargetActive;
  meleeAttackState.meleeComboTarget = target;
  meleeAttackState.meleeComboHits = chainActive
    ? Math.max(1, currentHits + 1)
    : 1;
  meleeAttackState.meleeComboExpiresAt = now + COMBO_WINDOW_MS;
  if (meleeAttackState.meleeComboHits >= 2) {
    const comboGemCount = Math.min(
      MELEE_COMBO_GRACE_GEMS_MAX,
      MELEE_COMBO_GRACE_GEMS_BASE + Math.max(0, meleeAttackState.meleeComboHits - 2),
    );
    rewardMeleeGraceBurst(target, comboGemCount, 40 + meleeAttackState.meleeComboHits * 8);
  }
  if (meleeAttackState.punishCounterTarget === target) {
    meleeAttackState.punishCounterExpiresAt = meleeAttackState.meleeComboExpiresAt;
    if (
      meleeAttackState.punishCounterPrimed &&
      !meleeAttackState.punishCounterTextShown &&
      meleeAttackState.meleeComboHits >= 2
    ) {
      meleeAttackState.pendingCounterHitTarget = null;
      meleeAttackState.pendingCounterHitShowAt = 0;
      clearActiveCounterHitText(meleeAttackState, target, true);
      triggerPunishCounterText(target, meleeAttackState);
      rewardMeleeGraceBurst(target, PUNISH_COUNTER_GRACE_GEMS, 72);
      meleeAttackState.punishCounterTextShown = true;
    }
  } else if (meleeAttackState.punishCounterTarget) {
    clearPunishCounterState(meleeAttackState);
  }
  updateMeleeComboLabel(meleeAttackState);
}

function getNormalSlashChainHits(target, meleeAttackState, now) {
  if (!target || !meleeAttackState) return 0;
  const expiresAt = Number(meleeAttackState.normalSlashExpiresAt) || 0;
  if (expiresAt <= 0 || now > expiresAt) return 0;
  if (meleeAttackState.normalSlashTarget !== target) return 0;
  return Math.max(0, Math.round(meleeAttackState.normalSlashHits || 0));
}

function registerNormalSlashChainHit(target, meleeAttackState, now) {
  if (!target || !meleeAttackState) return 0;
  const timeNow =
    typeof now === "number"
      ? now
      : typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();
  const priorHits = getNormalSlashChainHits(target, meleeAttackState, timeNow);
  const nextHits = priorHits + 1;
  meleeAttackState.normalSlashTarget = target;
  meleeAttackState.normalSlashHits = nextHits;
  meleeAttackState.normalSlashExpiresAt = timeNow + NORMAL_A_CHAIN_WINDOW_MS;
  return nextHits;
}

function registerDivineShotComboHit(target, meleeAttackState) {
  if (!target || !meleeAttackState) return;
  registerMeleeComboHit(target, meleeAttackState);
  if (
    meleeAttackState.punishCounterTarget === target &&
    meleeAttackState.punishCounterPrimed &&
    !meleeAttackState.punishCounterTextShown
  ) {
    meleeAttackState.pendingCounterHitTarget = null;
    meleeAttackState.pendingCounterHitShowAt = 0;
    clearActiveCounterHitText(meleeAttackState, target, true);
    triggerPunishCounterText(target, meleeAttackState);
    rewardMeleeGraceBurst(target, PUNISH_COUNTER_GRACE_GEMS, 72);
    meleeAttackState.punishCounterTextShown = true;
  }
}

function showComboTextAt(entity, comboDamage, hitCount, lastHitDamage = 0, forceImmediate = false) {
  if (!entity || !Number.isFinite(comboDamage) || comboDamage <= 0) return;
  const now =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  if (window.BattlechurchComboTrackerEnabled) {
    if (!forceImmediate || !window.BattlechurchComboTrackerAllow) return;
  }
  const meleeState = window._meleeAttackState;
  if (
    meleeState &&
    !forceImmediate &&
    meleeState.comboLockoutUntil &&
    now < meleeState.comboLockoutUntil
  ) {
    return;
  }
  if (meleeState && !forceImmediate && hitCount === 2) {
    const pendingTarget = meleeState.pendingComboTarget;
    const pendingShowAt = meleeState.pendingComboShowAt || 0;
    if (pendingTarget === entity && now <= pendingShowAt) {
      const addDamage = Number.isFinite(lastHitDamage) ? lastHitDamage : 0;
      const lastAt = meleeState.pendingComboLastAt || 0;
      if (now - lastAt < 80) {
        // Likely duplicate trigger for the same hit pair; don't upgrade hit count.
        meleeState.pendingComboDamage = Math.max(
          meleeState.pendingComboDamage || 0,
          comboDamage,
        );
        meleeState.pendingComboLastAt = now;
        return;
      }
      const currentHits = meleeState.pendingComboHits || 2;
      meleeState.pendingComboDamage = (meleeState.pendingComboDamage || 0) + addDamage;
      meleeState.pendingComboHits = Math.max(currentHits + 1, 3);
      meleeState.pendingComboShowAt = now + 80;
      meleeState.pendingComboLastAt = now;
      return;
    }
    meleeState.pendingComboTarget = entity;
    meleeState.pendingComboDamage = comboDamage;
    meleeState.pendingComboShowAt = now + 140;
    meleeState.pendingComboHits = 2;
    meleeState.pendingComboLastAt = now;
    return;
  }
  if (
    meleeState &&
    meleeState.lastComboTextTarget === entity &&
    typeof meleeState.lastComboTextAt === "number" &&
    now - meleeState.lastComboTextAt < 150
  ) {
    return;
  }
  if (meleeState && hitCount >= 3 && meleeState.pendingComboTarget === entity) {
    meleeState.pendingComboTarget = null;
    meleeState.pendingComboDamage = 0;
    meleeState.pendingComboShowAt = 0;
    meleeState.pendingComboHits = 0;
    meleeState.pendingComboLastAt = 0;
  }
  if (meleeState) {
    meleeState.lastComboTextTarget = entity;
    meleeState.lastComboTextAt = now;
    meleeState.comboLockoutUntil = now + MELEE_DOUBLE_TAP_WINDOW * 1000;
  }
  const hits = Number.isFinite(hitCount) && hitCount > 0 ? Math.round(hitCount) : 2;
  const labelFontSize = getComboLabelFontSize(hits);
  const labelColor = getComboLabelColor(hits);
  maybeUpdateMaxComboInTown(hits, entity.x, entity.y);
  updateHudComboDisplay({
    hits,
    damage: comboDamage,
    fontSize: labelFontSize,
    color: labelColor,
    durationMs: 1100,
  });
}

function executeBasicMeleeAttack(dir, meleeAttackState, swingCenterX, swingCenterY, options = {}) {
  // Canonical move name: "Slash" is the default A melee attack.
  const now =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  meleeAttackState.active = true;
  meleeAttackState.fade = MELEE_DAMAGE_DURATION;
  meleeAttackState.swingId += 1;
  meleeAttackState.currentAttackHitboxType = "slash";
  beginMeleeHitstopSequence(meleeAttackState);
  meleeAttackState.didAttackThisPress = true;
  meleeAttackState.cooldown = MELEE_COOLDOWN;
  meleeAttackState.swooshTimer = GAME_MELEE_SWING_DURATION;
  meleeAttackState.swooshDir = { x: dir.x, y: dir.y };

  // Trigger player attack animation
  if (player && player.animator) {
    player.state = "attackMelee";
    player.animator.play("attackMelee", { restart: true });
  }
  maybeFireWordOfGodProjectile(dir, Math.atan2(dir.y, dir.x));

  const hitEnemies = [];
  let hitBoss = false;
  let survivorHit = false;
  let meleeDamageTotal = 0;
  let meleePrimaryTarget = null;
  const attackAngle = Math.atan2(dir.y, dir.x);
  const attackRect = getPlayerWeaponHitboxLocalRect(player);
  const cos = Math.cos(-attackAngle);
  const sin = Math.sin(-attackAngle);
  enemies.forEach((enemy) => {
    if (enemy.dead || enemy.state === "death") return;
    const hitCenter = getEnemyHitboxCenter(enemy);
    const relX = hitCenter.x - player.x;
    const relY = hitCenter.y - player.y;
    const localX = relX * cos - relY * sin;
    const localY = relX * sin + relY * cos;
    const hitRadius = getEnemyHitboxRadius(enemy);
    if (attackRect) {
      if (!circleIntersectsRect(localX, localY, hitRadius, attackRect)) return;
    } else {
      const dx = enemy.x - swingCenterX;
      const dy = enemy.y - swingCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > MELEE_SWING_RANGE + hitRadius) return;
      const dotProduct = dx * dir.x + dy * dir.y;
      if (dotProduct < 0 && dist > MELEE_CLOSE_RANGE + hitRadius) return;
    }
    hitEnemies.push(enemy);
    if (!meleePrimaryTarget) meleePrimaryTarget = enemy;
    const counterHit = getCounterHitResult(enemy, MELEE_BASE_DAMAGE, meleeAttackState);
    const damage = counterHit.damage;
    const slashChainHitsBefore = getNormalSlashChainHits(enemy, meleeAttackState, now);
    const repeatedSlashPressure = slashChainHitsBefore >= 1;
    enemy.takeDamage(damage, {
      damageType: "melee",
      damageText: counterHit.damageText,
      hurtDuration: repeatedSlashPressure ? NORMAL_A_REHIT_HURT_DURATION : undefined,
    });
    applyMeleeHitstop(enemy, meleeAttackState, counterHit);
    registerPunishComboDamage(enemy, damage, meleeAttackState);
    registerMeleeComboHit(enemy, meleeAttackState);
    registerNormalSlashChainHit(enemy, meleeAttackState, now);
    registerComboHit(enemy, damage);
    meleeDamageTotal += damage;
    if (
      !meleeAttackState.divineComboShown &&
      meleeAttackState.divineComboDamage > 0 &&
      meleeAttackState.divineComboActiveUntil &&
      now <= meleeAttackState.divineComboActiveUntil &&
      meleeAttackState.divineComboTarget === enemy &&
      enemy.state === "hurt"
    ) {
      const hits = (meleeAttackState.divineComboHits || 2) + 1;
      showComboTextAt(enemy, meleeAttackState.divineComboDamage + damage, hits);
      meleeAttackState.divineComboShown = true;
      meleeAttackState.divineComboActiveUntil = 0;
      meleeAttackState.divineComboDamage = 0;
      meleeAttackState.divineComboTarget = null;
      meleeAttackState.divineComboHits = 0;
      meleeAttackState.spinComboShown = true;
      meleeAttackState.spinComboActiveUntil = 0;
      meleeAttackState.spinComboDamage = 0;
      meleeAttackState.rushComboShown = true;
      meleeAttackState.rushComboActiveUntil = 0;
      meleeAttackState.rushComboDamage = 0;
    } else if (
      meleeAttackState.spinComboDamage > 0 &&
      meleeAttackState.spinComboActiveUntil &&
      now <= meleeAttackState.spinComboActiveUntil &&
      !meleeAttackState.spinComboShown &&
      enemy.state === "hurt"
    ) {
      showComboTextAt(enemy, meleeAttackState.spinComboDamage + damage, 2, damage);
      meleeAttackState.spinComboShown = true;
      meleeAttackState.spinComboActiveUntil = 0;
      meleeAttackState.spinComboDamage = 0;
    } else if (
      !meleeAttackState.rushComboShown &&
      meleeAttackState.rushComboDamage > 0 &&
      meleeAttackState.rushComboActiveUntil &&
      now <= meleeAttackState.rushComboActiveUntil &&
      enemy.state === "hurt"
    ) {
      const baseHits = meleeAttackState.rushComboHits || 1;
      showComboTextAt(enemy, meleeAttackState.rushComboDamage + damage, baseHits + 1, damage);
      meleeAttackState.rushComboShown = true;
      meleeAttackState.rushComboActiveUntil = 0;
      meleeAttackState.rushComboDamage = 0;
      meleeAttackState.rushComboHits = 0;
      meleeAttackState.rushComboTarget = null;
    }
    if (!enemy.dead && enemy.state !== "death") {
      if (!repeatedSlashPressure) {
        applyEnemyMeleeKnockback(enemy, swingCenterX, swingCenterY, MELEE_PUSHBACK_STRENGTH);
      }
      survivorHit = true;
    }
    spawnEnemyHitEffect(enemy);
  });
  if (tryTriggerCongregationDialogueFromMelee(dir, swingCenterX, swingCenterY, attackRect)) {
    congregationWelcomeTimer = Infinity;
  }
  if (activeBoss && !activeBoss.dead && !activeBoss.defeated && !activeBoss.removed) {
    const hitCenter = getEnemyHitboxCenter(activeBoss);
    const relX = hitCenter.x - player.x;
    const relY = hitCenter.y - player.y;
    const localX = relX * cos - relY * sin;
    const localY = relX * sin + relY * cos;
    const hitRadius = activeBoss.radius || 0;
    const bossHit = attackRect
      ? circleIntersectsRect(localX, localY, hitRadius, attackRect)
      : (() => {
          const dx = activeBoss.x - swingCenterX;
          const dy = activeBoss.y - swingCenterY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > MELEE_SWING_RANGE + hitRadius) return false;
          const dotProduct = dx * dir.x + dy * dir.y;
          return !(dotProduct < 0 && dist > MELEE_CLOSE_RANGE + hitRadius);
        })();
    if (bossHit) {
        const counterHit = getCounterHitResult(activeBoss, MELEE_BASE_DAMAGE, meleeAttackState);
        const damage = counterHit.damage;
        const slashChainHitsBefore = getNormalSlashChainHits(activeBoss, meleeAttackState, now);
        const repeatedSlashPressure = slashChainHitsBefore >= 1;
        activeBoss.takeDamage(damage, {
          hitX: activeBoss.x,
          hitY: activeBoss.y,
          damageType: "melee",
          damageText: counterHit.damageText,
          hurtDuration: repeatedSlashPressure ? NORMAL_A_REHIT_HURT_DURATION : undefined,
        });
        applyMeleeHitstop(activeBoss, meleeAttackState, counterHit);
        registerPunishComboDamage(activeBoss, damage, meleeAttackState);
        registerMeleeComboHit(activeBoss, meleeAttackState);
        registerNormalSlashChainHit(activeBoss, meleeAttackState, now);
        registerComboHit(activeBoss, damage);
        meleeDamageTotal += damage;
        if (
          !meleeAttackState.divineComboShown &&
          meleeAttackState.divineComboDamage > 0 &&
          meleeAttackState.divineComboActiveUntil &&
          now <= meleeAttackState.divineComboActiveUntil &&
          meleeAttackState.divineComboTarget === activeBoss &&
          activeBoss.state === "hurt"
        ) {
          const hits = (meleeAttackState.divineComboHits || 2) + 1;
          showComboTextAt(activeBoss, meleeAttackState.divineComboDamage + damage, hits);
          meleeAttackState.divineComboShown = true;
          meleeAttackState.divineComboActiveUntil = 0;
          meleeAttackState.divineComboDamage = 0;
          meleeAttackState.divineComboTarget = null;
          meleeAttackState.divineComboHits = 0;
          meleeAttackState.spinComboShown = true;
          meleeAttackState.spinComboActiveUntil = 0;
          meleeAttackState.spinComboDamage = 0;
          meleeAttackState.rushComboShown = true;
          meleeAttackState.rushComboActiveUntil = 0;
          meleeAttackState.rushComboDamage = 0;
        } else if (
          meleeAttackState.spinComboDamage > 0 &&
          meleeAttackState.spinComboActiveUntil &&
          now <= meleeAttackState.spinComboActiveUntil &&
          !meleeAttackState.spinComboShown &&
          activeBoss.state === "hurt"
        ) {
          showComboTextAt(activeBoss, meleeAttackState.spinComboDamage + damage, 2, damage);
          meleeAttackState.spinComboShown = true;
          meleeAttackState.spinComboActiveUntil = 0;
          meleeAttackState.spinComboDamage = 0;
        } else if (
          !meleeAttackState.rushComboShown &&
          meleeAttackState.rushComboDamage > 0 &&
          meleeAttackState.rushComboActiveUntil &&
          now <= meleeAttackState.rushComboActiveUntil &&
          activeBoss.state === "hurt"
        ) {
          const baseHits = meleeAttackState.rushComboHits || 1;
          showComboTextAt(activeBoss, meleeAttackState.rushComboDamage + damage, baseHits + 1, damage);
          meleeAttackState.rushComboShown = true;
          meleeAttackState.rushComboActiveUntil = 0;
          meleeAttackState.rushComboDamage = 0;
          meleeAttackState.rushComboHits = 0;
          meleeAttackState.rushComboTarget = null;
        }
        hitBoss = true;
        if (!meleePrimaryTarget) meleePrimaryTarget = activeBoss;
        if (typeof activeBoss.knockbackVx === "number") {
          if (!repeatedSlashPressure) {
            applyEnemyMeleeKnockback(activeBoss, swingCenterX, swingCenterY, MELEE_PUSHBACK_STRENGTH);
          }
        }
        if (!activeBoss.dead && !activeBoss.defeated) {
          survivorHit = true;
        }
        spawnEnemyHitEffect(activeBoss);
    }
  }
  if (hitEnemies.length > 0 || hitBoss) {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    meleeAttackState.awaitRush = true;
    meleeAttackState.awaitTimer = MELEE_DOUBLE_TAP_WINDOW;
    meleeAttackState.rushBypassUntil = now + MELEE_DOUBLE_TAP_WINDOW * 1000;
    meleeAttackState.comboDamage = meleeDamageTotal;
    meleeAttackState.comboActiveUntil = now + MELEE_DOUBLE_TAP_WINDOW * 1000;
    meleeAttackState.comboShown = false;
    meleeAttackState.meleeCancelUntil = now + MELEE_DOUBLE_TAP_WINDOW * 1000;
    meleeAttackState.meleeCancelDamage = meleeDamageTotal;
    meleeAttackState.meleeCancelTarget = meleePrimaryTarget;
  }
  if (hitEnemies.length > 0 || hitBoss) {
    if (typeof playEnemyHitSfx === "function") {
      playEnemyHitSfx(0.6);
    }
  } else {
    const missSwingSfx = options?.missSwingSfx || "sword";
    if (missSwingSfx === "dash") {
      if (typeof playDashSfx === "function") {
        playDashSfx(0.6);
      }
    } else if (missSwingSfx === "rush") {
      if (typeof playRushAttackSfx === "function") {
        playRushAttackSfx(0.6);
      }
    } else if (missSwingSfx !== "none") {
      if (typeof playSwordSfx === "function") {
        playSwordSfx(0.5);
      }
    }
  }
  meleeAttackState.projectileBlockTimer = MELEE_PROJECTILE_COOLDOWN_AFTER;
}

function executeSwooshAttack(dir, meleeAttackState, angleRad) {
  // Canonical move name: "Dash Slash" is the normal B/A follow-up from an active dash.
  const now =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  meleeAttackState.swooshTimer = GAME_MELEE_SWING_DURATION;
  meleeAttackState.swooshDir = { x: dir.x, y: dir.y };
  meleeAttackState.currentAttackHitboxType = "dashSlash";
  beginMeleeHitstopSequence(meleeAttackState);
  applyMeleeInvulnerability(meleeAttackState, "swoosh", getDashSwooshInvulnerabilityDuration());

  // Trigger player attack animation
  if (player && player.animator) {
    player.state = "attackMelee";
    player.animator.play("attackMelee", { restart: true });
  }
  maybeFireWordOfGodProjectile(dir, angleRad);
  meleeAttackState.swooshDamageEnabled = true;
  meleeAttackState.swooshHitEntities = new Set();

  const swooshAngle = angleRad;
  const swooshDamage = Math.round(MELEE_BASE_DAMAGE * MELEE_SWOOSH_DAMAGE_SCALE);
  const hitboxRect = getPlayerDashSlashHitboxLocalRect(player);
  if (!hitboxRect) return;
  const cos = Math.cos(-swooshAngle);
  const sin = Math.sin(-swooshAngle);
  let hitBoss = false;
  let survivorHit = false;
  let meleeDamageTotal = 0;
  enemies.forEach((enemy) => {
    if (enemy.dead || enemy.state === "death") return;
    if (meleeAttackState.swooshHitEntities?.has(enemy)) return;
    const relX = enemy.x - player.x;
    const relY = enemy.y - player.y;
    const localX = relX * cos - relY * sin;
    const localY = relX * sin + relY * cos;
    const hitRadius = getEnemyHitboxRadius(enemy) || enemy.radius || 0;
    if (!circleIntersectsRect(localX, localY, hitRadius, hitboxRect)) return;
    meleeAttackState.swooshHitEntities?.add(enemy);
    const counterHit = getCounterHitResult(enemy, swooshDamage, meleeAttackState);
    const finalDamage = counterHit.damage;
    enemy.takeDamage(finalDamage, { damageType: "melee", damageText: counterHit.damageText });
    applyMeleeHitstop(enemy, meleeAttackState, counterHit);
    registerPunishComboDamage(enemy, finalDamage, meleeAttackState);
    registerMeleeComboHit(enemy, meleeAttackState);
    registerComboHit(enemy, finalDamage);
    meleeDamageTotal += finalDamage;
    if (
      !meleeAttackState.divineComboShown &&
      meleeAttackState.divineComboDamage > 0 &&
      meleeAttackState.divineComboActiveUntil &&
      now <= meleeAttackState.divineComboActiveUntil &&
      meleeAttackState.divineComboTarget === enemy &&
      enemy.state === "hurt"
    ) {
      const hits = (meleeAttackState.divineComboHits || 2) + 1;
      showComboTextAt(enemy, meleeAttackState.divineComboDamage + finalDamage, hits);
      meleeAttackState.divineComboShown = true;
      meleeAttackState.divineComboActiveUntil = 0;
      meleeAttackState.divineComboDamage = 0;
      meleeAttackState.divineComboTarget = null;
      meleeAttackState.divineComboHits = 0;
      meleeAttackState.rushComboShown = true;
      meleeAttackState.rushComboActiveUntil = 0;
      meleeAttackState.rushComboDamage = 0;
    } else if (
      !meleeAttackState.rushComboShown &&
      meleeAttackState.rushComboDamage > 0 &&
      meleeAttackState.rushComboActiveUntil &&
      now <= meleeAttackState.rushComboActiveUntil &&
      enemy.state === "hurt"
    ) {
      showComboTextAt(enemy, meleeAttackState.rushComboDamage + finalDamage, 2, finalDamage);
      meleeAttackState.rushComboShown = true;
      meleeAttackState.rushComboActiveUntil = 0;
      meleeAttackState.rushComboDamage = 0;
    }
    if (!enemy.dead && enemy.state !== "death") {
      applyEnemyMeleeKnockback(enemy, player.x, player.y, MELEE_DAMAGE_KNOCKBACK);
      survivorHit = true;
    }
    spawnEnemyHitEffect(enemy);
    if (typeof playEnemyHitSfx === "function") {
      playEnemyHitSfx(0.6);
    }
  });
  if (activeBoss && !activeBoss.dead && !activeBoss.defeated && !activeBoss.removed) {
    if (meleeAttackState.swooshHitEntities?.has(activeBoss)) {
      // Already hit this dash.
    } else {
    const relX = activeBoss.x - player.x;
    const relY = activeBoss.y - player.y;
    const localX = relX * cos - relY * sin;
    const localY = relX * sin + relY * cos;
    const hitRadius = activeBoss.radius || 0;
    if (circleIntersectsRect(localX, localY, hitRadius, hitboxRect)) {
      meleeAttackState.swooshHitEntities?.add(activeBoss);
      const counterHit = getCounterHitResult(activeBoss, swooshDamage, meleeAttackState);
      const finalDamage = counterHit.damage;
      activeBoss.takeDamage(finalDamage, {
        hitX: activeBoss.x,
        hitY: activeBoss.y,
        damageType: "melee",
        damageText: counterHit.damageText,
      });
      applyMeleeHitstop(activeBoss, meleeAttackState, counterHit);
      registerPunishComboDamage(activeBoss, finalDamage, meleeAttackState);
      registerMeleeComboHit(activeBoss, meleeAttackState);
      registerComboHit(activeBoss, finalDamage);
      meleeDamageTotal += finalDamage;
      if (
        !meleeAttackState.divineComboShown &&
        meleeAttackState.divineComboDamage > 0 &&
        meleeAttackState.divineComboActiveUntil &&
        now <= meleeAttackState.divineComboActiveUntil &&
        meleeAttackState.divineComboTarget === activeBoss &&
        activeBoss.state === "hurt"
      ) {
        const hits = (meleeAttackState.divineComboHits || 2) + 1;
        showComboTextAt(activeBoss, meleeAttackState.divineComboDamage + finalDamage, hits);
        meleeAttackState.divineComboShown = true;
        meleeAttackState.divineComboActiveUntil = 0;
        meleeAttackState.divineComboDamage = 0;
        meleeAttackState.divineComboTarget = null;
        meleeAttackState.divineComboHits = 0;
        meleeAttackState.rushComboShown = true;
        meleeAttackState.rushComboActiveUntil = 0;
        meleeAttackState.rushComboDamage = 0;
      } else if (
        !meleeAttackState.rushComboShown &&
        meleeAttackState.rushComboDamage > 0 &&
        meleeAttackState.rushComboActiveUntil &&
        now <= meleeAttackState.rushComboActiveUntil &&
        activeBoss.state === "hurt"
      ) {
        showComboTextAt(activeBoss, meleeAttackState.rushComboDamage + finalDamage, 2, finalDamage);
        meleeAttackState.rushComboShown = true;
        meleeAttackState.rushComboActiveUntil = 0;
        meleeAttackState.rushComboDamage = 0;
      }
      hitBoss = true;
      if (typeof activeBoss.knockbackVx === "number") {
        applyEnemyMeleeKnockback(activeBoss, player.x, player.y, MELEE_DAMAGE_KNOCKBACK);
      }
      if (!activeBoss.dead && !activeBoss.defeated) {
        survivorHit = true;
      }
      spawnEnemyHitEffect(activeBoss);
    }
    }
  }
  if (survivorHit) {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    meleeAttackState.rushBypassUntil = now + MELEE_DOUBLE_TAP_WINDOW * 1000;
    meleeAttackState.comboDamage = meleeDamageTotal;
    meleeAttackState.comboActiveUntil = now + MELEE_DOUBLE_TAP_WINDOW * 1000;
    meleeAttackState.comboShown = false;
  }
  if (hitBoss && typeof playEnemyHitSfx === "function") {
    playEnemyHitSfx(0.6);
  }
  if (typeof playSwooshSfx === "function") {
    playSwooshSfx(0.6);
  }
  meleeAttackState.cooldown = MELEE_COOLDOWN;
  meleeAttackState.projectileBlockTimer = MELEE_PROJECTILE_COOLDOWN_AFTER;
  meleeAttackState.awaitRush = true;
  meleeAttackState.awaitTimer = MELEE_DOUBLE_TAP_WINDOW;
}

function applyDashSlashTravelDamage(meleeAttackState) {
  if (!player || !playerDashState.isDashing || !meleeAttackState?.swooshDamageEnabled) return;
  const angleRad = Math.atan2(playerDashState.dashDir.y, playerDashState.dashDir.x);
  const swooshDamage = Math.round(MELEE_BASE_DAMAGE * MELEE_SWOOSH_DAMAGE_SCALE);
  const hitboxRect = getPlayerDashSlashHitboxLocalRect(player);
  if (!hitboxRect) return;
  if (!meleeAttackState.swooshHitEntities) {
    meleeAttackState.swooshHitEntities = new Set();
  }
  const hitSet = meleeAttackState.swooshHitEntities;
  const now =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  const cos = Math.cos(-angleRad);
  const sin = Math.sin(-angleRad);

  enemies.forEach((enemy) => {
    if (enemy.dead || enemy.state === "death" || hitSet.has(enemy)) return;
    const relX = enemy.x - player.x;
    const relY = enemy.y - player.y;
    const localX = relX * cos - relY * sin;
    const localY = relX * sin + relY * cos;
    const hitRadius = getEnemyHitboxRadius(enemy) || enemy.radius || 0;
    if (!circleIntersectsRect(localX, localY, hitRadius, hitboxRect)) return;
    hitSet.add(enemy);
    const counterHit = getCounterHitResult(enemy, swooshDamage, meleeAttackState);
    const finalDamage = counterHit.damage;
    enemy.takeDamage(finalDamage, { damageType: "melee", damageText: counterHit.damageText });
    applyMeleeHitstop(enemy, meleeAttackState, counterHit);
    registerPunishComboDamage(enemy, finalDamage, meleeAttackState);
    registerMeleeComboHit(enemy, meleeAttackState);
    registerComboHit(enemy, finalDamage);
    if (!enemy.dead && enemy.state !== "death") {
      applyEnemyMeleeKnockback(enemy, player.x, player.y, MELEE_DAMAGE_KNOCKBACK);
    }
    if (
      !meleeAttackState.divineComboShown &&
      meleeAttackState.divineComboDamage > 0 &&
      meleeAttackState.divineComboActiveUntil &&
      now <= meleeAttackState.divineComboActiveUntil &&
      meleeAttackState.divineComboTarget === enemy &&
      enemy.state === "hurt"
    ) {
      const hits = (meleeAttackState.divineComboHits || 2) + 1;
      showComboTextAt(enemy, meleeAttackState.divineComboDamage + finalDamage, hits);
      meleeAttackState.divineComboShown = true;
      meleeAttackState.divineComboActiveUntil = 0;
      meleeAttackState.divineComboDamage = 0;
      meleeAttackState.divineComboTarget = null;
      meleeAttackState.divineComboHits = 0;
    }
    spawnEnemyHitEffect(enemy);
  });

  if (
    activeBoss &&
    !activeBoss.dead &&
    !activeBoss.defeated &&
    !activeBoss.removed &&
    !hitSet.has(activeBoss)
  ) {
    const relX = activeBoss.x - player.x;
    const relY = activeBoss.y - player.y;
    const localX = relX * cos - relY * sin;
    const localY = relX * sin + relY * cos;
    const hitRadius = activeBoss.radius || 0;
    if (circleIntersectsRect(localX, localY, hitRadius, hitboxRect)) {
      hitSet.add(activeBoss);
      const counterHit = getCounterHitResult(activeBoss, swooshDamage, meleeAttackState);
      const finalDamage = counterHit.damage;
      activeBoss.takeDamage(finalDamage, {
        hitX: activeBoss.x,
        hitY: activeBoss.y,
        damageType: "melee",
        damageText: counterHit.damageText,
      });
      applyMeleeHitstop(activeBoss, meleeAttackState, counterHit);
      registerPunishComboDamage(activeBoss, finalDamage, meleeAttackState);
      registerMeleeComboHit(activeBoss, meleeAttackState);
      registerComboHit(activeBoss, finalDamage);
      if (typeof activeBoss.knockbackVx === "number") {
        applyEnemyMeleeKnockback(activeBoss, player.x, player.y, MELEE_DAMAGE_KNOCKBACK);
      }
      spawnEnemyHitEffect(activeBoss);
    }
  }
}

function executeRushAttack(dir, meleeAttackState, { skipYell = false } = {}) {
  if (playerDashState?.isDashing) return false;
  if (!isSharedBButtonReady()) return false;
  if (!dir || (dir.x === 0 && dir.y === 0)) return false;
  if (!skipYell) playerYell("Rush Attack", 2.4);
  const now =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  const rushTravelMs = Math.ceil((RUSH_DISTANCE / Math.max(1, RUSH_SPEED || 1)) * 1000);
  const rushComboCarryUntil = now + rushTravelMs + COMBO_WINDOW_MS;
  if (meleeAttackState.meleeComboTarget && (meleeAttackState.meleeComboHits || 0) > 0) {
    meleeAttackState.meleeComboExpiresAt = Math.max(
      Number(meleeAttackState.meleeComboExpiresAt) || 0,
      rushComboCarryUntil,
    );
  }
  if (meleeAttackState.punishCounterTarget) {
    meleeAttackState.punishCounterExpiresAt = Math.max(
      Number(meleeAttackState.punishCounterExpiresAt) || 0,
      rushComboCarryUntil,
    );
  }
  meleeAttackState.isRushing = true;
  beginMeleeHitstopSequence(meleeAttackState);
  meleeAttackState.rushDir = { x: dir.x, y: dir.y };
  meleeAttackState.rushDistanceRemaining = RUSH_DISTANCE;
  meleeAttackState.rushDustAccumulator = 0;
  meleeAttackState.rushHitEntities = new Set();
  if (meleeAttackState.lastComboTimes) {
    meleeAttackState.lastComboTimes.A = 0;
    meleeAttackState.lastComboTimes.B = 0;
  }
  setSharedBButtonCooldown(RUSH_COOLDOWN);
  meleeAttackState.rushDamageEnabled = true;
  meleeAttackState.rushInvulnerable = true;
  applyMeleeInvulnerability(meleeAttackState, "rush", RUSH_EXIT_INVULNERABILITY);
  meleeAttackState.rushLockTimer = MELEE_RUSH_LOCKOUT;
  maybeFireWordOfGodProjectile(dir, Math.atan2(dir.y, dir.x));
  playRushAttackSfx(0.9);
  return true;
}

function getTeleportFallbackTarget() {
  if (!player) return null;
  const angle = Math.random() * Math.PI * 2;
  const dist = 400 + Math.random() * 200;
  const margin = 40;
  const topLimit = (typeof HUD_HEIGHT === "number" ? HUD_HEIGHT : 80) + margin;
  const cw = canvas?.width || 1920;
  const ch = canvas?.height || 1080;
  return {
    x: Math.max(margin, Math.min(cw - margin, player.x + Math.cos(angle) * dist)),
    y: Math.max(topLimit, Math.min(ch - margin, player.y + Math.sin(angle) * dist)),
  };
}

function getNearestActivePowerup() {
  if (!player) return null;
  let nearest = null;
  let nearestDist = Infinity;
  const check = (arr, isActive) => {
    arr.forEach((p) => {
      if (!p || !isActive(p)) return;
      const d = Math.hypot(p.x - player.x, p.y - player.y);
      if (d < nearestDist) { nearestDist = d; nearest = p; }
    });
  };
  check(weaponPickups, (p) => p.active && !p.expired);
  check(utilityPowerUps, (p) => !p.collected && !p.dead);
  check(churchPowerupPickups, (p) => !p.collected && !p.dead);
  return nearest;
}

function getActiveTeleportPowerups() {
  const targets = [];
  const collect = (arr, isActive) => {
    arr.forEach((p) => {
      if (!p || !isActive(p)) return;
      targets.push(p);
    });
  };
  collect(weaponPickups, (p) => p.active && !p.expired);
  collect(utilityPowerUps, (p) => !p.collected && !p.dead);
  collect(churchPowerupPickups, (p) => !p.collected && !p.dead);
  return targets;
}

function getNearestTeleportTargetIndex(targets) {
  if (!player || !Array.isArray(targets) || !targets.length) return -1;
  let nearestIndex = 0;
  let nearestDist = Infinity;
  for (let i = 0; i < targets.length; i += 1) {
    const target = targets[i];
    const d = Math.hypot(target.x - player.x, target.y - player.y);
    if (d < nearestDist) {
      nearestDist = d;
      nearestIndex = i;
    }
  }
  return nearestIndex;
}

function executeProtectedDash(meleeAttackState) {
  if (!player) return;
  playerYell("Power Dash");
  const target = getNearestActivePowerup();
  let dir;
  if (target) {
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const dist = Math.hypot(dx, dy);
    dir = dist > 0 ? { x: dx / dist, y: dy / dist } : getDashButtonDirection();
  } else {
    dir = getDashButtonDirection();
  }
  if (!dir || (dir.x === 0 && dir.y === 0)) return;
  if (tryStartDash(dir)) {
    playerDashState.dashDistanceRemaining = PROTECTED_DASH_DISTANCE;
    const dashDuration = PROTECTED_DASH_DISTANCE / Math.max(1, DASH_SPEED);
    applyMeleeInvulnerability(meleeAttackState, "rush", dashDuration + RUSH_EXIT_INVULNERABILITY);
  }
}

function playerYell(text, life = 1.6) {
  window.FloatingText?.heroSay(text, { life });
}

function npcsYell(text, life = 1.6) {
  if (!Array.isArray(npcs)) return;
  npcs.forEach((npc) => {
    if (npc && !npc.departed && npc.active) {
      window.FloatingText?.npcCheer(npc, text, "#fffbe8", { life });
    }
  });
}
window.npcsYell = npcsYell;

function executePowerupTeleport(meleeAttackState) {
  if (!player) return;
  const target = meleeAttackState.teleportGhostTarget || getNearestActivePowerup();
  if (!target) return;
  playerYell("Teleport");
  player.x = target.x;
  player.y = target.y;
  resolveEntityObstacles(player);
  clampEntityToBounds(player);
  if (player.lockedPosition) {
    player.lockedPosition.x = player.x;
    player.lockedPosition.y = player.y;
  }
  applyMeleeInvulnerability(meleeAttackState, "rush", TELEPORT_INVULNERABILITY_DURATION);
  spawnFlashEffect(player.x, player.y);
  applyCameraShake(0.18, 0.5);
  const teleportCost = (player.prayerChargeRequired || 60) / 3;
  player.prayerCharge = Math.max(0, (player.prayerCharge || 0) - teleportCost);
  player.prayerHoldTimer = 0;
  player.prayerHoldLocked = false;
  if (typeof Input !== "undefined") Input.prayerBombClickQueued = false;
  meleeAttackState.bcTeleportArmed = false;
  meleeAttackState.teleportGhostTarget = null;
  meleeAttackState.bcTeleportBlockTimer = 0.4;
}

function spawnRingOfFireHazard(centerX, centerY, radius) {
  ringOfFireHazards.push({
    x: centerX,
    y: centerY,
    radius,
    life: RING_OF_FIRE_LINGER_DURATION,
    duration: RING_OF_FIRE_LINGER_DURATION,
    band: RING_OF_FIRE_BAND,
    damage: RING_OF_FIRE_DAMAGE,
    bossDamage: RING_OF_FIRE_BOSS_DAMAGE,
    hitCooldown: RING_OF_FIRE_HIT_COOLDOWN,
    hitMap: new WeakMap(),
    blinkWindow: Math.min(1.2, RING_OF_FIRE_LINGER_DURATION),
    blinkTimer: 0,
    visible: true,
    blinkAlpha: 1,
  });
}

function executeRingOfFireAttack(meleeAttackState) {
  if (!player) return false;
  const centerX = player.x;
  const centerY = player.y;
  executeSpinAttack(meleeAttackState, null);
  meleeAttackState.ringFireActive = true;
  meleeAttackState.ringFirePhase = "trace";
  meleeAttackState.ringFireCenterX = centerX;
  meleeAttackState.ringFireCenterY = centerY;
  meleeAttackState.ringFireRadius = RING_OF_FIRE_RADIUS;
  meleeAttackState.ringFireStartAngle = -Math.PI * 0.5;
  meleeAttackState.ringFireDirection = meleeAttackState.spinVisualDirection || 1;
  meleeAttackState.ringFireAngle = meleeAttackState.ringFireStartAngle;
  meleeAttackState.ringFireTraceProgress = 0;
  player.invulnerableTimer = Math.max(player.invulnerableTimer || 0, RING_OF_FIRE_INVULNERABILITY);
  return true;
}

function executeSpinAttack(meleeAttackState, moveDir) {
  if (!player) return;
  meleeAttackState.swingLength = null;
  const dir = getSpinAttackDirection();
  if (typeof player.updateFacing === "function") {
    player.updateFacing(dir.x, dir.y);
  }
  const facingLeft = player.facing === "left" || player.flipHorizontal === true;
  meleeAttackState.spinVisualDirection = facingLeft ? -1 : 1;
  beginMeleeHitstopSequence(meleeAttackState);
  maybeFireWordOfGodProjectile(dir, Math.atan2(dir.y, dir.x));
  if (moveDir && (moveDir.x !== 0 || moveDir.y !== 0)) {
    const normalized = normalizeVector(moveDir.x, moveDir.y);
    meleeAttackState.spinMoveDir = normalized;
    meleeAttackState.spinMoveDistanceRemaining = SPIN_MOVE_DISTANCE;
  } else {
    meleeAttackState.spinMoveDir = null;
    meleeAttackState.spinMoveDistanceRemaining = 0;
  }
  setSharedBButtonCooldown(MELEE_SPIN_COOLDOWN);
  meleeAttackState.buttonDown = false;
  meleeAttackState.isCharging = false;
  meleeAttackState.chargeTimer = 0;
  meleeAttackState.awaitRush = false;
  meleeAttackState.awaitTimer = 0;
  meleeAttackState.spinTimer = MELEE_SPIN_DURATION;
  meleeAttackState.spinDuration = MELEE_SPIN_DURATION;
  meleeAttackState.spinHitEntities = new Set();
  meleeAttackState.spinFacingDir = { x: dir.x, y: dir.y };
  meleeAttackState.projectileBlockTimer = MELEE_PROJECTILE_COOLDOWN_AFTER;
  if (player && player.animator) {
    player.state = "attackMelee";
    player.animator.play("attackMelee", { restart: true });
  }
  playRushAttackSfx(0.8);
}

function executeDivineShot(dir, meleeAttackState, angleRad, { skipYell = false } = {}) {
  if (!skipYell) playerYell("Divine Shot!");
  const now =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  const spawnX = player.x + Math.cos(angleRad) * MELEE_OFFSET;
  const spawnY = player.y + Math.sin(angleRad) * MELEE_OFFSET;
  const vx = Math.cos(angleRad) * DIVINE_SHOT_SPEED;
  const vy = Math.sin(angleRad) * DIVINE_SHOT_SPEED;

  spawnProjectile("divine_shot", spawnX, spawnY, vx, vy, {
    friendly: true,
    damage: DIVINE_SHOT_DAMAGE,
    life: DIVINE_SHOT_LIFE,
    source: player,
    damageType: "charged",
    autoAimDuration: DIVINE_SHOT_AUTO_AIM_DURATION,
    autoAimStrength: DIVINE_SHOT_AUTO_AIM_STRENGTH,
    autoAimMinDot: DIVINE_SHOT_AUTO_AIM_MIN_DOT,
    priority: DIVINE_SHOT_PROJECTILE_PRIORITY,
    isDivineShot: true,
  });

  if (typeof playDivineShotSfx === "function") {
    playDivineShotSfx(0.6);
  }

  meleeAttackState.divineShotFollowUpUntil = now + MELEE_DOUBLE_TAP_WINDOW * 1000;
  meleeAttackState.cooldown = 0;
}

function executeSwordRush(meleeAttackState) {
  if (!player) return;
  const dir = getDashButtonDirection();
  const angleRad = Math.atan2(dir.y, dir.x);
  const startedRush = executeRushAttack(dir, meleeAttackState, { skipYell: true });
  if (!startedRush) return;
  playerYell("Sword Rush!");
  executeDivineShot(dir, meleeAttackState, angleRad, { skipYell: true });
}

function updateRingOfFireMotion(dt, meleeAttackState) {
  if (!player || !meleeAttackState?.ringFireActive) return;
  const centerX = meleeAttackState.ringFireCenterX;
  const centerY = meleeAttackState.ringFireCenterY;
  const radius = Math.max(1, meleeAttackState.ringFireRadius || RING_OF_FIRE_RADIUS);
  if (meleeAttackState.spinTimer > 0) {
    const duration = Math.max(0.001, meleeAttackState.spinDuration || MELEE_SPIN_DURATION);
    const progress = 1 - Math.min(1, meleeAttackState.spinTimer / duration);
    meleeAttackState.ringFireTraceProgress = progress;
    meleeAttackState.ringFireAngle =
      meleeAttackState.ringFireStartAngle +
      progress * Math.PI * 2 * (meleeAttackState.ringFireDirection || 1);
  } else {
    meleeAttackState.ringFireActive = false;
    meleeAttackState.ringFirePhase = null;
    meleeAttackState.ringFireTraceProgress = 1;
    spawnRingOfFireHazard(centerX, centerY, radius);
    spawnFlashEffect(centerX, centerY);
    applyCameraShake(Math.max(CAMERA_SHAKE_DURATION, 0.16), CAMERA_SHAKE_INTENSITY);
  }
}

function updateRingOfFireHazards(dt) {
  if (!ringOfFireHazards.length) return;
  const now = typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
  for (let i = ringOfFireHazards.length - 1; i >= 0; i -= 1) {
    const hazard = ringOfFireHazards[i];
    hazard.life = Math.max(0, (hazard.life || 0) - dt);
    const exiting = hazard.life <= Math.max(0, hazard.blinkWindow || 0);
    if (exiting) {
      const blinkWindow = Math.max(0.001, hazard.blinkWindow || 0.001);
      const urgency = 1 - Math.max(0, Math.min(1, hazard.life / blinkWindow));
      const blinkRate = 5 + urgency * 17;
      hazard.blinkTimer = (hazard.blinkTimer || 0) + dt * blinkRate;
      hazard.blinkAlpha = Math.sin(hazard.blinkTimer) > 0 ? 1 : 0.16;
      hazard.visible = true;
    } else {
      hazard.blinkAlpha = 1;
      hazard.visible = true;
    }
    const band = Math.max(1, hazard.band || RING_OF_FIRE_BAND);
    const outerRadius = (hazard.radius || RING_OF_FIRE_RADIUS) + band * 0.5;
    const innerRadius = Math.max(0, (hazard.radius || RING_OF_FIRE_RADIUS) - band * 0.5);
    const canHit = (entity) => {
      if (!entity || entity.dead || entity.state === "death") return false;
      const lastAt = hazard.hitMap?.get(entity) || 0;
      return now - lastAt >= (hazard.hitCooldown || RING_OF_FIRE_HIT_COOLDOWN) * 1000;
    };
    const markHit = (entity) => {
      if (hazard.hitMap) hazard.hitMap.set(entity, now);
    };
    enemies.forEach((enemy) => {
      if (!canHit(enemy)) return;
      const center = getEnemyHitboxCenter(enemy);
      const dist = Math.hypot(center.x - hazard.x, center.y - hazard.y);
      const targetRadius = getEnemyHitboxRadius(enemy);
      if (dist - targetRadius > outerRadius) return;
      markHit(enemy);
      enemy.takeDamage(hazard.damage, { damageType: "charged" });
      if (!enemy.dead && enemy.state !== "death") {
        applyEnemyMeleeKnockback(enemy, hazard.x, hazard.y, MELEE_DAMAGE_KNOCKBACK * 0.75);
      }
      spawnEnemyHitEffect(enemy, center.x, center.y, { damageType: "charged" });
    });
    if (activeBoss && !activeBoss.dead && !activeBoss.defeated && !activeBoss.removed && canHit(activeBoss)) {
      const center = getEnemyHitboxCenter(activeBoss);
      const dist = Math.hypot(center.x - hazard.x, center.y - hazard.y);
      const targetRadius = activeBoss.radius || 0;
      if (dist - targetRadius <= outerRadius) {
        markHit(activeBoss);
        activeBoss.takeDamage(hazard.bossDamage, {
          hitX: center.x,
          hitY: center.y,
          damageType: "charged",
        });
        if (typeof activeBoss.knockbackVx === "number" && !activeBoss.dead && !activeBoss.defeated) {
          applyEnemyMeleeKnockback(activeBoss, hazard.x, hazard.y, MELEE_DAMAGE_KNOCKBACK * 0.45);
        }
        spawnEnemyHitEffect(activeBoss, center.x, center.y, { damageType: "charged" });
      }
    }
    projectiles.forEach((projectile) => {
      if (!projectile || projectile.dead || projectile.friendly || projectile.visualOnly) return;
      const pr = Math.max(0, projectile.radius || 0);
      const dist = Math.hypot((projectile.x || 0) - hazard.x, (projectile.y || 0) - hazard.y);
      if (dist + pr < innerRadius || dist - pr > outerRadius) return;
      projectile.dead = true;
      spawnImpactEffect(projectile.x, projectile.y);
      spawnFlashEffect(projectile.x, projectile.y);
    });
    if (hazard.life <= 0) {
      ringOfFireHazards.splice(i, 1);
    }
  }
}

function maybeFireWordOfGodProjectile(dir, angleRad) {
  return;
}

function updateMeleeTimers(dt, meleeAttackState) {
  meleeAttackState.cooldown = Math.max(0, (meleeAttackState.cooldown || 0) - dt);

  const readyNow = updateSharedBButtonCooldown(dt) && !meleeAttackState.isRushing;
  if (readyNow && player) {
    spawnFlashEffect(player.x, player.y + (player.radius || 24));
  }

  if (meleeAttackState.active && meleeAttackState.fade > 0) {
    meleeAttackState.fade = Math.max(0, meleeAttackState.fade - dt);
    if (meleeAttackState.fade === 0) {
      meleeAttackState.active = false;
    }
  }

  if (meleeAttackState.swooshTimer > 0) {
    meleeAttackState.swooshTimer = Math.max(0, meleeAttackState.swooshTimer - dt);
  }
  if (meleeAttackState.swooshShieldDebugTimer > 0) {
    meleeAttackState.swooshShieldDebugTimer = Math.max(0, meleeAttackState.swooshShieldDebugTimer - dt);
  }
  if (meleeAttackState.spinTimer > 0) {
    meleeAttackState.spinTimer = Math.max(0, meleeAttackState.spinTimer - dt);
  }

  if (meleeAttackState.projectileBlockTimer > 0) {
    meleeAttackState.projectileBlockTimer = Math.max(0, meleeAttackState.projectileBlockTimer - dt);
  }

  meleeAttackState.rushLockTimer = Math.max(0, meleeAttackState.rushLockTimer - dt);
  if (meleeAttackState.rushShieldDebugTimer > 0) {
    meleeAttackState.rushShieldDebugTimer = Math.max(0, meleeAttackState.rushShieldDebugTimer - dt);
  }
  if (meleeAttackState.rushHitboxTimer > 0) {
    meleeAttackState.rushHitboxTimer = Math.max(0, meleeAttackState.rushHitboxTimer - dt);
  }
  if (meleeAttackState.bcTeleportBlockTimer > 0) {
    meleeAttackState.bcTeleportBlockTimer = Math.max(0, meleeAttackState.bcTeleportBlockTimer - dt);
  }
  if (meleeAttackState.cBHolyDashBlockTimer > 0) {
    meleeAttackState.cBHolyDashBlockTimer = Math.max(0, meleeAttackState.cBHolyDashBlockTimer - dt);
  }
  if (meleeAttackState.doubleStrikeTimer > 0) {
    meleeAttackState.doubleStrikeTimer = Math.max(0, meleeAttackState.doubleStrikeTimer - dt);
    if (meleeAttackState.doubleStrikeTimer <= 0 && meleeAttackState.doubleStrikePending) {
      meleeAttackState.doubleStrikePending = false;
      const d = meleeAttackState.doubleStrikeDir;
      if (player && d) {
        const angleRad = Math.atan2(d.y, d.x);
        const swingCenterX = player.x + Math.cos(angleRad) * MELEE_OFFSET;
        const swingCenterY = player.y + Math.sin(angleRad) * MELEE_OFFSET;
        executeBasicMeleeAttack(d, meleeAttackState, swingCenterX, swingCenterY, {
          missSwingSfx: "rush",
        });
        meleeAttackState.swooshTimer = 0;
        meleeAttackState.doubleStrikeSwooshTimer = GAME_MELEE_SWING_DURATION * 2.5;
        meleeAttackState.doubleStrikeSwooshDir = { x: d.x, y: d.y };
      }
      meleeAttackState.doubleStrikeDir = null;
    }
  }
  if (meleeAttackState.doubleStrikeSwooshTimer > 0) {
    meleeAttackState.doubleStrikeSwooshTimer = Math.max(0, meleeAttackState.doubleStrikeSwooshTimer - dt);
  }
}

function updateChargeState(dt, meleeAttackState) {
  const chargingA = meleeAttackState.isCharging;
  const chargingB = meleeAttackState.spinCharging;
  if (!chargingA && !chargingB) return;

  if (chargingA) {
    meleeAttackState.chargeTimer += dt;
  }

  const chargeTimer = chargingA ? meleeAttackState.chargeTimer : meleeAttackState.spinChargeTimer;
  const holdTime = chargingA ? meleeAttackState.holdTime : meleeAttackState.spinHoldTime;
  const flashTriggered = chargingA
    ? meleeAttackState.chargeFlashTriggered
    : meleeAttackState.spinChargeFlashTriggered;
  const chargeComplete = chargeTimer >= holdTime;

  if (chargeComplete && !flashTriggered) {
    if (chargingA) {
      meleeAttackState.chargeFlashTriggered = true;
    } else {
      meleeAttackState.spinChargeFlashTriggered = true;
    }
    if (typeof playChargeCompleteSfx === "function") {
      playChargeCompleteSfx(0.6);
    }

    // Stop the Raybolt animation and spawn flash effect to show charge is ready
    if (player && divineChargeSparkEffect) {
      const sparkX = divineChargeSparkEffect.x;
      const sparkY = divineChargeSparkEffect.y;

      // Kill the Raybolt effect
      divineChargeSparkEffect.dead = true;
      divineChargeSparkEffect = null;

      // Spawn flash effect
      if (divineChargeFlashEffect && !divineChargeFlashEffect.dead) {
        divineChargeFlashEffect.dead = true;
      }
      divineChargeFlashEffect = null;
      const readyEffect = spawnDivineChargeReadyVisual("melee");
      if (readyEffect) {
        readyEffect.x = sparkX;
        readyEffect.y = sparkY;
      }
    }
  }

  // Only show Raybolt after melee swing animation completes (0.2s) and before charge complete
  if (!chargeComplete && chargeTimer >= GAME_MELEE_SWING_DURATION) {
    updateDivineChargeSparkVisual(dt, chargeTimer, holdTime);
  }

  // Update flash position if it exists
  if (divineChargeFlashEffect && !divineChargeFlashEffect.dead && player) {
    const anchor = getPlayerChargeVisualAnchor(player);
    if (anchor) {
      divineChargeFlashEffect.x = anchor.x;
      divineChargeFlashEffect.y = anchor.y;
    }
  }
}

function updateMeleeAttackSystem(dt) {
  // Melee attack logic: only trigger once per key press, deal damage once, and disappear
  if (!window._meleeAttackState)
    window._meleeAttackState = {
      active: false,
      fade: 0,
      cooldown: 0,
      buttonDown: false,
      didAttackThisPress: false,
      swingId: 0,
      hitstopSequenceId: 0,
      hitstopAppliedSequenceId: 0,
      chargeTimer: 0,
      isCharging: false,
      spinChargeTimer: 0,
      spinCharging: false,
      spinButtonDown: false,
      isRushing: false,
      rushJustEnded: false,
      rushDir: { x: 1, y: 0 },
      rushDistanceRemaining: 0,
      rushHitEntities: null,
      rushCooldown: 0,
      rushDustAccumulator: 0,
      rushShieldDebugTimer: 0,
      chargeFlashTriggered: false,
      spinChargeFlashTriggered: false,
      rushInvulnerable: false,
      spinTimer: 0,
      spinDuration: 0,
      spinHitEntities: null,
      spinCooldown: 0,
      spinVisualDirection: 1,
      ringFireActive: false,
      ringFirePhase: null,
      ringFireCenterX: 0,
      ringFireCenterY: 0,
      ringFireRadius: 0,
      ringFireStartAngle: 0,
      ringFireDirection: 1,
      ringFireAngle: 0,
      ringFireTraceProgress: 0,
      spinMoveDir: null,
    spinMoveDistanceRemaining: 0,
    spinMeleeQueued: false,
    pendingComboTarget: null,
    pendingComboDamage: 0,
    pendingComboShowAt: 0,
    pendingComboHits: 0,
    pendingComboLastAt: 0,
    comboLockoutUntil: 0,
    lastComboTextTarget: null,
    lastComboTextAt: 0,
      rushHitboxTimer: 0,
      rushSegment: null,
    awaitRush: false,
    awaitTimer: 0,
    rushBypassUntil: 0,
    swooshTimer: 0,
    swooshDir: { x: 1, y: 0 },
    swooshDamageEnabled: false,
    swooshHitEntities: null,
    projectileBlockTimer: 0,
    rushLockTimer: 0,
    rushDamageEnabled: false,
    comboDamage: 0,
    comboActiveUntil: 0,
    comboShown: false,
    spinComboDamage: 0,
    spinComboActiveUntil: 0,
    spinComboShown: false,
      rushComboDamage: 0,
      rushComboActiveUntil: 0,
      rushComboShown: false,
      rushComboHits: 0,
      rushComboTarget: null,
      swooshShieldDebugTimer: 0,
      meleeCancelUntil: 0,
    meleeCancelDamage: 0,
    meleeCancelTarget: null,
    divineShotFollowUpUntil: 0,
    divineComboDamage: 0,
    divineComboActiveUntil: 0,
    divineComboShown: false,
    divineComboTarget: null,
    divineComboHits: 0,
    normalSlashTarget: null,
    normalSlashHits: 0,
    normalSlashExpiresAt: 0,
    meleeComboTarget: null,
    meleeComboHits: 0,
    meleeComboExpiresAt: 0,
    meleeComboLabel: null,
    punishCounterTarget: null,
    punishCounterExpiresAt: 0,
    punishCounterPrimed: false,
    punishCounterTextShown: false,
    punishComboDamage: 0,
    pendingCounterHitTarget: null,
    pendingCounterHitShowAt: 0,
    activeCounterHitLabel: null,
    activeCounterHitTarget: null,
    activeCounterHitKind: null,
    activeCounterHitUntil: 0,
    pendingBasicAttack: null,
    currentAttackHitboxType: "slash",
    abSuperArmed: false,
    bcTeleportArmed: false,
    teleportGhostTarget: null,
    teleportTargetIndex: -1,
    bcTeleportBlockTimer: 0,
    cBHolyDashBlockTimer: 0,
    doubleStrikePending: false,
    doubleStrikeTimer: 0,
    doubleStrikeDir: null,
    doubleStrikeSwooshTimer: 0,
    doubleStrikeSwooshDir: null,
  };
  const meleeAttackState = window._meleeAttackState;
  const input = window.Input;

  if (input && player) {
    const playerAlive = Boolean(player && player.state !== "death");
    if (!playerAlive) {
      meleeAttackState.buttonDown = false;
      meleeAttackState.isCharging = false;
      meleeAttackState.awaitRush = false;
      clearMeleeComboLabel(meleeAttackState);
      meleeAttackState.pendingBasicAttack = null;
      meleeAttackState.meleeComboTarget = null;
      meleeAttackState.meleeComboHits = 0;
      meleeAttackState.meleeComboExpiresAt = 0;
      clearActiveCounterHitText(meleeAttackState);
      clearPunishCounterState(meleeAttackState);
      clearDivineChargeSparkVisual();
      return;
    }
    meleeAttackState.holdTime = MELEE_HOLD_CHARGE_TIME;
    meleeAttackState.spinHoldTime = SPIN_HOLD_CHARGE_TIME;
    const prevSpinTimer = meleeAttackState.spinTimer || 0;
    updateMeleeTimers(dt, meleeAttackState);
    const spinJustEnded = prevSpinTimer > 0 && meleeAttackState.spinTimer <= 0;
    if (!meleeAttackState.lastComboTimes) {
      meleeAttackState.lastComboTimes = { A: 0, B: 0, C: 0 };
    }
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (!meleeAttackState.isRushing && (keysJustPressed.has("ArrowLeft") || keysJustPressed.has(" "))) {
      meleeAttackState.lastComboTimes.A = now;
    }
    if (!meleeAttackState.isRushing && keysJustPressed.has("ArrowDown")) {
      meleeAttackState.lastComboTimes.B = now;
    }
    if (!meleeAttackState.isRushing && keysJustPressed.has("ArrowRight")) {
      meleeAttackState.lastComboTimes.C = now;
    }
    const comboWindowMs = MELEE_DOUBLE_TAP_WINDOW * 1000;
    const aRecent = now - meleeAttackState.lastComboTimes.A <= comboWindowMs;
    const bRecent = now - meleeAttackState.lastComboTimes.B <= comboWindowMs;
    const cRecent = now - (meleeAttackState.lastComboTimes.C || 0) <= comboWindowMs;
    const comboRushKeyOrder = aRecent && bRecent && meleeAttackState.lastComboTimes.B < meleeAttackState.lastComboTimes.A;
    const cCurrentlyHeld = keysPressed.has("ArrowRight");
    const comboPrayerStrikeOrder = cRecent && aRecent && meleeAttackState.lastComboTimes.C > 0 && meleeAttackState.lastComboTimes.C < meleeAttackState.lastComboTimes.A;
    const comboDoubleStrikeOrder = aRecent && bRecent && meleeAttackState.lastComboTimes.A > 0 && meleeAttackState.lastComboTimes.A < meleeAttackState.lastComboTimes.B;
    updateArcControlCooldowns();
    resolveQueuedBasicMeleeAttack(meleeAttackState);

    if (meleeAttackState.isRushing && player) {
      const direction = meleeAttackState.rushDir;
      updateRushMovement(dt, direction, meleeAttackState);
    }
    if (meleeAttackState.isRushing || meleeAttackState.rushJustEnded) {
      keysJustPressed.delete("ArrowDown");
      keysJustPressed.delete("ArrowLeft");
      keysJustPressed.delete(" ");
      if (meleeAttackState.isRushing && meleeAttackState.lastComboTimes) {
        meleeAttackState.lastComboTimes.A = 0;
        meleeAttackState.lastComboTimes.B = 0;
      }
    }

    if (meleeAttackState.ringFireActive) {
      updateRingOfFireMotion(dt, meleeAttackState);
      keysJustPressed.delete("ArrowDown");
      keysJustPressed.delete("ArrowLeft");
      keysJustPressed.delete(" ");
    }

    if (meleeAttackState.spinTimer > 0) {
      let spinDamageTotal = 0;
      let spinSurvivorHit = false;
      if (
        meleeAttackState.spinMoveDir &&
        meleeAttackState.spinMoveDistanceRemaining > 0 &&
        player
      ) {
        const dir = meleeAttackState.spinMoveDir;
        const movement = Math.min(
          meleeAttackState.spinMoveDistanceRemaining,
          SPIN_MOVE_SPEED * dt,
        );
        player.x += dir.x * movement;
        player.y += dir.y * movement;
        resolveEntityObstacles(player);
        clampEntityToBounds(player);
        if (player.lockedPosition) {
          player.lockedPosition.x = player.x;
          player.lockedPosition.y = player.y;
        }
        meleeAttackState.spinMoveDistanceRemaining -= movement;
        if (meleeAttackState.spinMoveDistanceRemaining <= 0) {
          meleeAttackState.spinMoveDistanceRemaining = 0;
          meleeAttackState.spinMoveDir = null;
        }
      }
      const duration = Math.max(0.001, meleeAttackState.spinDuration || MELEE_SPIN_DURATION);
      const progress = 1 - Math.min(1, meleeAttackState.spinTimer / duration);
      const angle = progress * Math.PI * 2;
      const targetLength = (meleeAttackState.swingLength ?? MELEE_SWING_LENGTH) * WORLD_SCALE;
      const swooshImg = assets?.effects?.meleeSwoosh;
      let drawWidth = targetLength;
      let drawHeight = targetLength * 0.6 * MELEE_SWOOSH_ARC_SCALE;
      if (swooshImg) {
        const swingScale = meleeAttackState.swingScale ?? targetLength / Math.max(1, swooshImg.width);
        drawWidth = swooshImg.width * swingScale;
        drawHeight = swooshImg.height * swingScale * MELEE_SWOOSH_ARC_SCALE;
      }
      const hitSet = meleeAttackState.spinHitEntities || new Set();
      meleeAttackState.spinHitEntities = hitSet;
      const cos = Math.cos(-angle);
      const sin = Math.sin(-angle);
      enemies.forEach((enemy) => {
        if (enemy.dead || enemy.state === "death") return;
        if (hitSet.has(enemy)) return;
        const relX = enemy.x - player.x;
        const relY = enemy.y - player.y;
        const localX = relX * cos - relY * sin;
        const localY = relX * sin + relY * cos;
        const hitRadius = getEnemyHitboxRadius(enemy) || enemy.radius || 0;
        const hit = circleIntersectsRect(localX, localY, hitRadius, {
          x: 0,
          y: -drawHeight * 0.5,
          width: drawWidth,
          height: drawHeight,
        });
        if (!hit) return;
        hitSet.add(enemy);
        const counterHit = getCounterHitResult(
          enemy,
          MELEE_BASE_DAMAGE * MELEE_SPIN_DAMAGE_MULTIPLIER,
          meleeAttackState,
        );
        const spinDamage = counterHit.damage;
        enemy.takeDamage(spinDamage, { damageType: "charged", damageText: counterHit.damageText });
        applyMeleeHitstop(enemy, meleeAttackState, counterHit);
        registerPunishComboDamage(enemy, spinDamage, meleeAttackState);
        registerMeleeComboHit(enemy, meleeAttackState);
        registerComboHit(enemy, spinDamage);
        spinDamageTotal += spinDamage;
        if (!enemy.dead && enemy.state !== "death") {
          applyEnemyMeleeKnockback(enemy, player.x, player.y, MELEE_DAMAGE_KNOCKBACK);
          spinSurvivorHit = true;
        }
        const now = typeof performance !== "undefined" ? performance.now() : Date.now();
        if (
          !meleeAttackState.divineComboShown &&
          meleeAttackState.divineComboDamage > 0 &&
          meleeAttackState.divineComboActiveUntil &&
          now <= meleeAttackState.divineComboActiveUntil &&
          meleeAttackState.divineComboTarget === enemy &&
          enemy.state === "hurt"
        ) {
          const hits = Math.max(2, (meleeAttackState.divineComboHits || 1) + 1);
          showComboTextAt(enemy, meleeAttackState.divineComboDamage + spinDamage, hits);
          meleeAttackState.divineComboShown = true;
          meleeAttackState.divineComboActiveUntil = 0;
          meleeAttackState.divineComboDamage = 0;
          meleeAttackState.divineComboTarget = null;
          meleeAttackState.divineComboHits = 0;
          meleeAttackState.rushComboShown = true;
          meleeAttackState.rushComboActiveUntil = 0;
          meleeAttackState.rushComboDamage = 0;
        } else
        if (
          meleeAttackState.comboDamage > 0 &&
          meleeAttackState.comboActiveUntil &&
          now <= meleeAttackState.comboActiveUntil &&
          !meleeAttackState.comboShown
        ) {
          showComboTextAt(enemy, meleeAttackState.comboDamage + spinDamage, 2, spinDamage);
          meleeAttackState.comboShown = true;
          meleeAttackState.comboActiveUntil = 0;
          meleeAttackState.comboDamage = 0;
        }
        spawnEnemyHitEffect(enemy);
        if (typeof playEnemyHitSfx === "function") {
          playEnemyHitSfx(0.6);
        }
      });
      if (activeBoss && !activeBoss.dead && !activeBoss.defeated && !activeBoss.removed) {
        if (!hitSet.has(activeBoss)) {
          const relX = activeBoss.x - player.x;
          const relY = activeBoss.y - player.y;
          const localX = relX * cos - relY * sin;
          const localY = relX * sin + relY * cos;
          const hitRadius = activeBoss.radius || 0;
          const hit = circleIntersectsRect(localX, localY, hitRadius, {
            x: 0,
            y: -drawHeight * 0.5,
            width: drawWidth,
            height: drawHeight,
          });
          if (hit) {
            hitSet.add(activeBoss);
            const counterHit = getCounterHitResult(
              activeBoss,
              MELEE_BASE_DAMAGE * MELEE_SPIN_DAMAGE_MULTIPLIER,
              meleeAttackState,
            );
            const spinDamage = counterHit.damage;
            activeBoss.takeDamage(spinDamage, {
              hitX: activeBoss.x,
              hitY: activeBoss.y,
              damageType: "charged",
              damageText: counterHit.damageText,
            });
            applyMeleeHitstop(activeBoss, meleeAttackState, counterHit);
            registerPunishComboDamage(activeBoss, spinDamage, meleeAttackState);
            registerMeleeComboHit(activeBoss, meleeAttackState);
            registerComboHit(activeBoss, spinDamage);
            spinDamageTotal += spinDamage;
            if (typeof activeBoss.knockbackVx === "number") {
              applyEnemyMeleeKnockback(activeBoss, player.x, player.y, MELEE_DAMAGE_KNOCKBACK);
            }
            if (!activeBoss.dead && !activeBoss.defeated) {
              spinSurvivorHit = true;
            }
            const now = typeof performance !== "undefined" ? performance.now() : Date.now();
            if (
              !meleeAttackState.divineComboShown &&
              meleeAttackState.divineComboDamage > 0 &&
              meleeAttackState.divineComboActiveUntil &&
              now <= meleeAttackState.divineComboActiveUntil &&
              meleeAttackState.divineComboTarget === activeBoss &&
              activeBoss.state === "hurt"
            ) {
              const hits = Math.max(2, (meleeAttackState.divineComboHits || 1) + 1);
              showComboTextAt(activeBoss, meleeAttackState.divineComboDamage + spinDamage, hits);
              meleeAttackState.divineComboShown = true;
              meleeAttackState.divineComboActiveUntil = 0;
              meleeAttackState.divineComboDamage = 0;
              meleeAttackState.divineComboTarget = null;
              meleeAttackState.divineComboHits = 0;
              meleeAttackState.rushComboShown = true;
              meleeAttackState.rushComboActiveUntil = 0;
              meleeAttackState.rushComboDamage = 0;
            } else
            if (
              meleeAttackState.comboDamage > 0 &&
              meleeAttackState.comboActiveUntil &&
              now <= meleeAttackState.comboActiveUntil &&
              !meleeAttackState.comboShown
            ) {
              showComboTextAt(activeBoss, meleeAttackState.comboDamage + spinDamage, 2, spinDamage);
              meleeAttackState.comboShown = true;
              meleeAttackState.comboActiveUntil = 0;
              meleeAttackState.comboDamage = 0;
            }
            spawnEnemyHitEffect(activeBoss);
            if (typeof playEnemyHitSfx === "function") {
              playEnemyHitSfx(0.6);
            }
          }
        }
      }
      if (spinSurvivorHit) {
        const now = typeof performance !== "undefined" ? performance.now() : Date.now();
        meleeAttackState.spinComboDamage = spinDamageTotal;
        meleeAttackState.spinComboActiveUntil = now + MELEE_DOUBLE_TAP_WINDOW * 1000;
        meleeAttackState.spinComboShown = false;
      }
    }
    const dir = getMeleeAttackDirection();
    if (spinJustEnded && meleeAttackState.spinComboDamage > 0 && !meleeAttackState.spinComboShown) {
      meleeAttackState.spinComboActiveUntil = now + MELEE_DOUBLE_TAP_WINDOW * 1000;
    }
    if (spinJustEnded && meleeAttackState.spinMeleeQueued) {
      meleeAttackState.spinMeleeQueued = false;
      if (!meleeAttackState.isCharging && player) {
        queueBasicMeleeAttack(dir, meleeAttackState);
        player.state = "attackMelee";
        player.animator.play("attackMelee", { restart: true });
      }
    }

    const comboSwipe = input?.consumeComboSwipe?.();
    const comboRush =
      (!meleeAttackState.isRushing &&
        !meleeAttackState.ringFireActive &&
        !(meleeAttackState.spinCharging && !comboRushKeyOrder) &&
        !(meleeAttackState.spinButtonDown && !comboRushKeyOrder) &&
        meleeAttackState.rushLockTimer <= 0 &&
        playerDashState.dashCooldown <= 0 &&
        !playerDashState.isDashing &&
        (comboRushKeyOrder ||
          (comboSwipe && comboSwipe.from === "B" && comboSwipe.to === "A")));
    let comboTriggered = false;
    if (comboRush && !comboTriggered) {
      playerDashState.pendingDashTimer = 0;
      meleeAttackState.spinButtonDown = false;
      meleeAttackState.spinCharging = false;
      meleeAttackState.spinChargeTimer = 0;
      const startedRush = executeRushAttack(getDashButtonDirection(), meleeAttackState);
      if (startedRush) {
        meleeAttackState.awaitRush = false;
        meleeAttackState.awaitTimer = 0;
        meleeAttackState.rushBypassUntil = 0;
        keysJustPressed.delete("ArrowLeft");
        keysJustPressed.delete(" ");
        comboTriggered = true;
      }
    }
    const holyDashCost = player ? (player.prayerChargeRequired || 60) / 6 : 10;
    // C/B Holy Dash: C must have been tapped (released) recently, then B pressed.
    // Holding C then pressing B routes to the B-charge path for Teleport instead.
    const bJustPressedRaw = keysJustPressed.has("ArrowDown");
    const comboHolyDash =
      !comboTriggered &&
      !playerDashState.isDashing &&
      cRecent &&
      !keysPressed.has("ArrowRight") &&
      bJustPressedRaw &&
      !meleeAttackState.spinButtonDown &&
      !meleeAttackState.isRushing &&
      player &&
      (player.prayerCharge || 0) >= holyDashCost;
    if (comboHolyDash) {
      const holyDir = getDashButtonDirection();
      if (tryStartDash(holyDir)) {
        if (typeof cancelCongregationTap === "function") cancelCongregationTap();
        playerDashState.dashDistanceRemaining = DASH_DISTANCE * 2.5;
        playerDashState.isHolyDash = true;
        player.prayerCharge = Math.max(0, (player.prayerCharge || 0) - holyDashCost);
        playerYell("Holy Dash!");
        keysJustPressed.delete("ArrowDown");
        meleeAttackState.cBHolyDashBlockTimer = 0.5;
        comboTriggered = true;
      }
    }
    const comboDoubleStrike =
      !comboTriggered &&
      comboDoubleStrikeOrder &&
      !meleeAttackState.isRushing &&
      !meleeAttackState.spinButtonDown &&
      !meleeAttackState.doubleStrikePending &&
      playerDashState.dashCooldown <= 0;
    if (comboDoubleStrike) {
      playerYell("Double Strike!");
      meleeAttackState.doubleStrikePending = true;
      meleeAttackState.doubleStrikeTimer = DOUBLE_STRIKE_DELAY;
      meleeAttackState.doubleStrikeDir = { x: dir.x, y: dir.y };
      meleeAttackState.lastComboTimes.A = 0;
      meleeAttackState.lastComboTimes.B = 0;
      setSharedBButtonCooldown(DASH_COOLDOWN);
      keysJustPressed.delete("ArrowDown");
      comboTriggered = true;
    }
    const prayerStrikeCost = player ? (player.prayerChargeRequired || 60) / 3 : 20;
    const comboPrayerStrike =
      !comboTriggered &&
      comboPrayerStrikeOrder &&
      !meleeAttackState.isRushing &&
      !meleeAttackState.spinCharging &&
      !meleeAttackState.spinButtonDown &&
      meleeAttackState.spinTimer <= 0 &&
      meleeAttackState.rushLockTimer <= 0 &&
      player &&
      (player.prayerCharge || 0) >= prayerStrikeCost;
    if (comboPrayerStrike) {
      meleeAttackState.lastComboTimes.C = 0;
      meleeAttackState.lastComboTimes.A = 0;
      if (typeof cancelCongregationTap === "function") cancelCongregationTap();
      player.prayerCharge = Math.max(0, (player.prayerCharge || 0) - prayerStrikeCost);
      playerYell("Prayer Strike!");
      executeSpinAttack(meleeAttackState, null);
      meleeAttackState.swingLength = MELEE_SWING_LENGTH_BASE * 1.5;
      keysJustPressed.delete("ArrowLeft");
      keysJustPressed.delete(" ");
      comboTriggered = true;
    }
    const bJustPressed = keysJustPressed.has("ArrowDown") && !meleeAttackState.isRushing && !meleeAttackState.ringFireActive;
    const bHeld = keysPressed.has("ArrowDown") && !meleeAttackState.isRushing && !meleeAttackState.ringFireActive;
    if (bJustPressed && !meleeAttackState.spinButtonDown && !comboTriggered) {
      const startedCancelRush =
        meleeAttackState.meleeCancelUntil &&
        now <= meleeAttackState.meleeCancelUntil &&
        executeRushAttack(getDashButtonDirection(), meleeAttackState);
      if (startedCancelRush) {
        meleeAttackState.spinCharging = false;
        meleeAttackState.spinButtonDown = false;
        meleeAttackState.spinChargeTimer = 0;
      } else {
      meleeAttackState.spinButtonDown = true;
      meleeAttackState.spinCharging = true;
      meleeAttackState.spinChargeTimer = 0;
      meleeAttackState.spinChargeFlashTriggered = false;
      playerDashState.pendingDashTimer = 0;
      playerDashState.pendingDashDir = null;
      if (keysPressed.has("ArrowRight") && typeof cancelCongregationTap === "function") cancelCongregationTap();
      }
    }
    if (meleeAttackState.spinButtonDown && bHeld && meleeAttackState.spinCharging) {
      meleeAttackState.spinChargeTimer += dt;
      const teleportCost = player ? (player.prayerChargeRequired || 60) / 3 : 20;
      const bFullyCharged = meleeAttackState.spinChargeTimer >= (meleeAttackState.spinHoldTime || 0);
      const cHeld = keysPressed.has("ArrowRight");
      const hasPrayerForTeleport = player && (player.prayerCharge || 0) >= teleportCost;
      if (!meleeAttackState.bcTeleportArmed && bFullyCharged && cHeld && hasPrayerForTeleport) {
        meleeAttackState.bcTeleportArmed = true;
        meleeAttackState.teleportTargetIndex = -1;
        if (typeof cancelCongregationTap === "function") cancelCongregationTap();
      }
      if (meleeAttackState.bcTeleportArmed) {
        const teleportTargets = getActiveTeleportPowerups();
        if (teleportTargets.length) {
          let targetIndex = Number.isFinite(meleeAttackState.teleportTargetIndex)
            ? Math.round(meleeAttackState.teleportTargetIndex)
            : -1;
          if (targetIndex < 0 || targetIndex >= teleportTargets.length) {
            targetIndex = getNearestTeleportTargetIndex(teleportTargets);
          } else {
            const cycleLeft = keysJustPressed.has("a");
            const cycleRight = keysJustPressed.has("d");
            if (cycleLeft || cycleRight) {
              const step = (cycleRight ? 1 : 0) - (cycleLeft ? 1 : 0);
              targetIndex = (targetIndex + step + teleportTargets.length) % teleportTargets.length;
              keysJustPressed.delete("a");
              keysJustPressed.delete("d");
            }
          }
          meleeAttackState.teleportTargetIndex = targetIndex;
          const selectedTarget = teleportTargets[targetIndex] || null;
          if (selectedTarget) {
            meleeAttackState.teleportGhostTarget = { x: selectedTarget.x, y: selectedTarget.y };
          }
        } else {
          meleeAttackState.teleportTargetIndex = -1;
          meleeAttackState.teleportGhostTarget = getTeleportFallbackTarget();
        }
      }
    }
    if (meleeAttackState.spinButtonDown && !bHeld) {
      const fullyCharged = meleeAttackState.spinChargeTimer >= meleeAttackState.spinHoldTime;
      const cHeldOnBRelease = keysPressed.has("ArrowRight");
      const teleportCost = player ? (player.prayerChargeRequired || 60) / 3 * 2 : 40;
      const hasPrayerForTeleport = player && (player.prayerCharge || 0) >= teleportCost;
      const shouldTeleport = meleeAttackState.bcTeleportArmed ||
        (fullyCharged && cHeldOnBRelease && hasPrayerForTeleport);
      const canABSuper = Boolean(meleeAttackState.abSuperArmed);
      meleeAttackState.abSuperArmed = false;
      meleeAttackState.spinButtonDown = false;
      if (meleeAttackState.spinCharging) {
        meleeAttackState.spinCharging = false;
        if (canABSuper) {
          // Cancel A charge so it doesn't also fire independently
          meleeAttackState.isCharging = false;
          meleeAttackState.buttonDown = false;
          meleeAttackState.chargeTimer = 0;
          meleeAttackState.acSuperArmed = false;
          clearDivineChargeSparkVisual();
          executeSwordRush(meleeAttackState);
        } else if (shouldTeleport) {
          executePowerupTeleport(meleeAttackState);
        } else if (fullyCharged) {
          executeProtectedDash(meleeAttackState);
        } else if (!meleeAttackState.isRushing) {
          tryStartDash(getDashButtonDirection());
        }
      }
      meleeAttackState.bcTeleportArmed = false;
      meleeAttackState.teleportGhostTarget = null;
      meleeAttackState.teleportTargetIndex = -1;
      if (!meleeAttackState.isCharging) {
        clearDivineChargeSparkVisual();
      }
      meleeAttackState.spinChargeTimer = 0;
    }
    const spaceJustPressed =
      (keysJustPressed.has(" ") || keysJustPressed.has("ArrowLeft")) &&
      !meleeAttackState.isRushing &&
      !meleeAttackState.ringFireActive &&
      meleeAttackState.rushLockTimer <= 0;
    const spaceHeld = (keysPressed.has(" ") || keysPressed.has("ArrowLeft")) && !meleeAttackState.isRushing && !meleeAttackState.ringFireActive;
    const rushLockActive = meleeAttackState.rushLockTimer > 0;
    const rushBypassActive =
      meleeAttackState.rushBypassUntil && now <= meleeAttackState.rushBypassUntil;
    if (meleeAttackState.awaitRush || rushBypassActive) {
      meleeAttackState.awaitTimer -= dt;
      if (meleeAttackState.awaitTimer <= 0) {
        meleeAttackState.awaitRush = false;
        meleeAttackState.awaitTimer = 0;
        meleeAttackState.rushBypassUntil = 0;
      }
    }

    if (spaceJustPressed && !meleeAttackState.buttonDown && !rushLockActive) {
      meleeAttackState.acSuperArmed = false;
      if (meleeAttackState.spinTimer > 0) {
        meleeAttackState.spinTimer = 0;
        meleeAttackState.spinMoveDir = null;
        meleeAttackState.spinMoveDistanceRemaining = 0;
        meleeAttackState.spinHitEntities = new Set();
        meleeAttackState.spinMeleeQueued = false;
        if (player) {
          queueBasicMeleeAttack(dir, meleeAttackState);
          player.state = "attackMelee";
          player.animator.play("attackMelee", { restart: true });
        }
      } else {
      if (playerDashState.isDashing) {
        applyMeleeInvulnerability(
          meleeAttackState,
          "swoosh",
          getDashSwooshInvulnerabilityDuration(),
        );
      }
      if (player && player.animator) {
        player.state = "attackMelee";
        player.animator.play("attackMelee", { restart: true });
      }
      meleeAttackState.buttonDown = true;
      meleeAttackState.chargeTimer = 0;
      meleeAttackState.isCharging = true;
      meleeAttackState.chargeFlashTriggered = false;
      }
    }
    if (!spaceHeld && meleeAttackState.buttonDown) {
      meleeAttackState.buttonDown = false;
      const fullyCharged = meleeAttackState.chargeTimer >= meleeAttackState.holdTime;
      const divineShotFollowUpActive =
        meleeAttackState.divineShotFollowUpUntil &&
        now <= meleeAttackState.divineShotFollowUpUntil;
      if (meleeAttackState.isCharging) {
        meleeAttackState.isCharging = false;
        clearDivineChargeSparkVisual();
        const canABSuper = Boolean(meleeAttackState.abSuperArmed);
        meleeAttackState.abSuperArmed = false;
        const canACSuper = Boolean(meleeAttackState.acSuperArmed);
        meleeAttackState.acSuperArmed = false;
        if (canABSuper) {
          // Cancel B charge so it doesn't also fire independently
          meleeAttackState.spinButtonDown = false;
          meleeAttackState.spinCharging = false;
          meleeAttackState.spinChargeTimer = 0;
          executeSwordRush(meleeAttackState);
        } else if (canACSuper) {
          const acSuperCost = player ? (player.prayerChargeRequired || 60) / 3 : 20;
          if (player) player.prayerCharge = Math.max(0, player.prayerCharge - acSuperCost);
          if (player) { player.prayerHoldLocked = false; player.prayerHoldTimer = 0; }
          if (typeof Input !== "undefined") Input.prayerBombClickQueued = false;
          if (typeof cancelCongregationTap === "function") cancelCongregationTap();
          playerYell("Holy Ground!");
          executeRingOfFireAttack(meleeAttackState);
        } else if (fullyCharged) {
          const angleRad = Math.atan2(dir.y, dir.x);
          executeDivineShot(dir, meleeAttackState, angleRad);
        } else if (meleeAttackState.cooldown <= 0 || divineShotFollowUpActive) {
          const angleRad = Math.atan2(dir.y, dir.x);
          meleeAttackState.divineShotFollowUpUntil = 0;
          // Check if player is dashing when pressing melee
          const shouldSwoosh = playerDashState.isDashing;
          if (shouldSwoosh) {
            executeSwooshAttack(dir, meleeAttackState, angleRad);
          } else {
            queueBasicMeleeAttack(dir, meleeAttackState);
            if (player && player.animator) {
              player.state = "attackMelee";
              player.animator.play("attackMelee", { restart: true });
            }
          }
        }
      }
    }
    updateChargeState(dt, meleeAttackState);
    if (!meleeAttackState.isCharging && !meleeAttackState.spinCharging) {
      clearDivineChargeSparkVisual();
    }
    const showPrayerBombReadyVisual = Boolean(
      player &&
      player.state !== "death" &&
      player.state !== "attackPrayer" &&
      !meleeAttackState.isCharging &&
      !meleeAttackState.spinCharging &&
      player.prayerHoldLocked,
    );
    if (showPrayerBombReadyVisual) {
      spawnDivineChargeReadyVisual("prayerBomb");
    } else {
      clearPrayerBombReadyVisual();
    }
    const comboNow = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (
      meleeAttackState.divineShotFollowUpUntil &&
      comboNow > meleeAttackState.divineShotFollowUpUntil
    ) {
      meleeAttackState.divineShotFollowUpUntil = 0;
    }
    if (
      meleeAttackState.normalSlashExpiresAt &&
      comboNow > meleeAttackState.normalSlashExpiresAt
    ) {
      meleeAttackState.normalSlashTarget = null;
      meleeAttackState.normalSlashHits = 0;
      meleeAttackState.normalSlashExpiresAt = 0;
    }
    if (meleeAttackState.meleeCancelUntil && comboNow > meleeAttackState.meleeCancelUntil) {
      meleeAttackState.meleeCancelUntil = 0;
      meleeAttackState.meleeCancelTarget = null;
      meleeAttackState.meleeCancelDamage = 0;
    }
    const comboCarryActive =
      meleeAttackState.isRushing ||
      (meleeAttackState.awaitRush && meleeAttackState.awaitTimer > 0) ||
      (meleeAttackState.rushBypassUntil && comboNow <= meleeAttackState.rushBypassUntil) ||
      (meleeAttackState.meleeCancelUntil && comboNow <= meleeAttackState.meleeCancelUntil);
    if (
      meleeAttackState.meleeComboExpiresAt &&
      comboNow > meleeAttackState.meleeComboExpiresAt &&
      !comboCarryActive
    ) {
      clearMeleeComboLabel(meleeAttackState);
      meleeAttackState.meleeComboTarget = null;
      meleeAttackState.meleeComboHits = 0;
      meleeAttackState.meleeComboExpiresAt = 0;
      clearActiveCounterHitText(meleeAttackState);
      clearPunishCounterState(meleeAttackState);
    } else if (
      meleeAttackState.meleeComboLabel &&
      (meleeAttackState.meleeComboTarget || meleeAttackState.activeCounterHitTarget)
    ) {
      if (comboCarryActive) {
        meleeAttackState.meleeComboExpiresAt = Math.max(
          Number(meleeAttackState.meleeComboExpiresAt) || 0,
          comboNow + COMBO_WINDOW_MS,
        );
        if (meleeAttackState.punishCounterTarget === meleeAttackState.meleeComboTarget) {
          meleeAttackState.punishCounterExpiresAt = Math.max(
            Number(meleeAttackState.punishCounterExpiresAt) || 0,
            meleeAttackState.meleeComboExpiresAt,
          );
        }
      }
      updateMeleeComboLabel(meleeAttackState);
    }
    if (
      meleeAttackState.punishCounterExpiresAt &&
      comboNow > meleeAttackState.punishCounterExpiresAt
    ) {
      clearPunishCounterState(meleeAttackState);
    }
    if (
      meleeAttackState.pendingCounterHitTarget &&
      meleeAttackState.pendingCounterHitShowAt &&
      comboNow >= meleeAttackState.pendingCounterHitShowAt
    ) {
      triggerCounterHitText(meleeAttackState.pendingCounterHitTarget, meleeAttackState);
      meleeAttackState.pendingCounterHitTarget = null;
      meleeAttackState.pendingCounterHitShowAt = 0;
    }
    meleeAttackState.rushJustEnded = false;
    if (
      meleeAttackState.pendingComboTarget &&
      meleeAttackState.pendingComboShowAt &&
      comboNow >= meleeAttackState.pendingComboShowAt
    ) {
      showComboTextAt(
        meleeAttackState.pendingComboTarget,
        meleeAttackState.pendingComboDamage,
        meleeAttackState.pendingComboHits || 2,
        0,
        true,
      );
      meleeAttackState.pendingComboTarget = null;
      meleeAttackState.pendingComboDamage = 0;
      meleeAttackState.pendingComboShowAt = 0;
      meleeAttackState.pendingComboHits = 0;
      meleeAttackState.pendingComboLastAt = 0;
    }
    if (
      meleeAttackState.rushComboDamage > 0 &&
      !meleeAttackState.rushComboShown &&
      meleeAttackState.rushComboActiveUntil &&
      comboNow > meleeAttackState.rushComboActiveUntil
    ) {
      const hits = Math.max(2, meleeAttackState.rushComboHits || 2);
      showComboTextAt(
        meleeAttackState.rushComboTarget || null,
        meleeAttackState.rushComboDamage,
        hits,
        0,
        true,
      );
      meleeAttackState.rushComboShown = true;
      meleeAttackState.rushComboActiveUntil = 0;
      meleeAttackState.rushComboDamage = 0;
      meleeAttackState.rushComboHits = 0;
      meleeAttackState.rushComboTarget = null;
    }
    if (
      meleeAttackState.divineComboDamage > 0 &&
      !meleeAttackState.divineComboShown &&
      meleeAttackState.divineComboActiveUntil &&
      comboNow > meleeAttackState.divineComboActiveUntil &&
      meleeAttackState.divineComboTarget
    ) {
      if ((meleeAttackState.divineComboHits || 0) >= 2) {
        showComboTextAt(
          meleeAttackState.divineComboTarget,
          meleeAttackState.divineComboDamage,
          meleeAttackState.divineComboHits,
        );
      }
      meleeAttackState.divineComboShown = true;
      meleeAttackState.divineComboActiveUntil = 0;
      meleeAttackState.divineComboDamage = 0;
      meleeAttackState.divineComboTarget = null;
      meleeAttackState.divineComboHits = 0;
    }
  }
}

function updateArcControlCooldowns() {
  if (!arcControl) return;
  const dashCooling = playerDashState && playerDashState.dashCooldown > 0;
  const bSegment = arcControl.querySelector(".arc-segment.arc-b");
  const bLabel = arcControl.querySelector(".arc-label[data-seg=\"B\"]");
  if (bSegment) bSegment.classList.toggle("is-cooldown", dashCooling);
  if (bLabel) bLabel.classList.toggle("is-cooldown", dashCooling);
}

function updateGame(dt) {
  if (window.MapScreen?.updateAmbient) {
    window.MapScreen.updateAmbient(dt);
  }
  if (fireOverlay) {
    fireOverlay.update(dt * 1000);
  }
  // Handle title screen even before player/assets are loaded
  if (titleScreenActive) {
    if (handleTitleScreen()) {
      return;
    }
  }
  if (mapActive) {
    if (!musicState.introStarted && !musicState.introStopped) {
      startIntroMusic();
    }
    // Map-screen dev shortcuts
    if (keysJustPressed.size) {
      const _mapModifiers = typeof Input !== "undefined" ? Input.modifiers : null;
      const _mapPressed = typeof Input !== "undefined" ? Input.keysPressed : null;
      const _mapShift = Boolean(_mapModifiers?.shift || _mapPressed?.has?.("Shift"));
      if (_mapShift && keysJustPressed.has("t")) {
        if (typeof window !== "undefined" && typeof window.MapScreen?.devAwardNextTown === "function") {
          void (async () => {
            const result = await window.MapScreen.devAwardNextTown({
              congregationCount: 100,
              campaign: "p1",
              churchPowerupLevels: {},
            });
            if (result?.awardedTownName) {
              setDevStatus(`Awarded town: ${result.awardedTownName}`, 2.3);
            } else {
              setDevStatus("No eligible town to award", 2.0);
            }
          })();
        }
        keysJustPressed.delete("t");
      }
      if (_mapShift && keysJustPressed.has("7")) {
        if (typeof window !== "undefined" && typeof window.MapScreen?.devUnlockAllTowns === "function") {
          const ok = window.MapScreen.devUnlockAllTowns();
          setDevStatus(ok ? "All 9 towns unlocked (dev)" : "Town unlock failed", 2.5);
        }
        keysJustPressed.delete("7");
      }
    }
    if (window.MapScreen) {
      window.MapScreen.update(dt);
    }
    return;
  }
  if (!player) return;
  handleDeveloperHotkeys();

  updateDebugSystems(dt);

  if (ashOverlay) {
    ashOverlay.update(dt * 1000);
  }

  updateCongregationOverlay(dt);

  if (epilogueActive) {
    // Toggle pause with spacebar (before scrolling is complete)
    if (!epilogueScroll.showButton && keysJustPressed.has(" ")) {
      epilogueScroll.paused = !epilogueScroll.paused;
      keysJustPressed.delete(" ");
    }
    // Update epilogue/credits scroll
    if (epilogueScroll.phase !== "done" && !epilogueScroll.paused) {
      // Handle start delay
      if (epilogueScroll.delayTimer < epilogueScroll.startDelay) {
        epilogueScroll.delayTimer += dt;
      } else {
        // Scroll the content (hold S to fast-forward)
        const fastForward =
          (typeof Input !== "undefined" && Input.keysPressed?.has?.("s")) || false;
        const speedMultiplier = fastForward ? 3 : 1;
        epilogueScroll.scrollY += epilogueScroll.scrollSpeed * dt * speedMultiplier;
      }
    }
    // Allow restart/continue when button is shown
    if (epilogueScroll.showButton && wasActionJustPressed("restart")) {
      restartGame();
    }
    return;
  }

  // Town Victory scene update (mini-epilogue after completing a town)
  if (townVictoryActive) {
    // Allow continue when button is shown (check FIRST before consuming keys)
    if (townVictoryScroll.showButton) {
      const spacePressed =
        keysJustPressed.has(" ") || keysJustPressed.has("enter") || keysJustPressed.has("Enter");
      const actionPressed = wasActionJustPressed("restart");
      const clickPos = Input.consumeCanvasClick?.();
      if (spacePressed || actionPressed || clickPos) {
        keysJustPressed.delete(" ");
        keysJustPressed.delete("enter");
        keysJustPressed.delete("Enter");
        townVictoryActive = false;
        returnToMapWithNextTown();
        return;
      }
    } else {
      // Update scroll (only when button not yet shown)
      // Handle start delay
      if (townVictoryScroll.delayTimer < townVictoryScroll.startDelay) {
        townVictoryScroll.delayTimer += dt;
      } else {
        // Scroll the content (hold spacebar to fast-forward - no skipping)
        const fastForward =
          (typeof Input !== "undefined" && Input.keysPressed?.has?.(" ")) || false;
        const speedMultiplier = fastForward ? 3 : 1;
        townVictoryScroll.scrollY += townVictoryScroll.scrollSpeed * dt * speedMultiplier;
      }
    }
    return;
  }

  updatePrayerBombFireRain(dt);

  if (updateTownIntroTransition(dt)) {
    return;
  }

  updateDeathFadeEffects(dt);
  updateDeathBellAudio(dt);
  npcHarmonyBuffTimer = Math.max(0, npcHarmonyBuffTimer - dt);
  if (!paused && weaponPickupAnnouncement.timer > 0) {
    weaponPickupAnnouncement.timer = Math.max(0, weaponPickupAnnouncement.timer - dt);
  }

  if (window.UpgradeScreen?.isVisible?.() && typeof Input?.consumeCanvasClick === "function") {
    const clickPos = Input.consumeCanvasClick();
    if (clickPos && typeof window.UpgradeScreen.handleCanvasClick === "function") {
      window.UpgradeScreen.handleCanvasClick(clickPos);
    }
    if (typeof window.UpgradeScreen.update === "function") {
      window.UpgradeScreen.update(dt);
    }
  }

  if (checkDialogOverlays()) {
    return;
  }

  updatePostDeathSequence(dt);
  updateFadeEffects(dt);

  if (handleChapterBreak()) {
    return;
  }

  const deathFreezeActive = postDeathSequenceActive;
  if (deathFreezeActive) {
    keysJustPressed.clear();
  }

  window.postDeathSequenceActive = postDeathSequenceActive;

  let levelStatus = levelManager?.getStatus ? levelManager.getStatus() : null;
  updateSpeedrunTimer(levelStatus);
  updateMusicState(levelStatus);
  if (
    levelStatus?.stage === "graceRush" &&
    keysJustPressed.has(" ") &&
    (graceRushState.elapsed || 0) >= (graceRushState.skipLockDuration || 0)
  ) {
    keysJustPressed.delete(" ");
    if (levelManager?.skipGraceRush) levelManager.skipGraceRush();
    graceRushState.active = false;
    graceRushState.timer = 0;
    graceRushState.elapsed = 0;
    graceRushState.spawnTimer = 0;
    graceRushState.centerX = null;
    graceRushState.centerY = null;
    resetGraceRushNpcFarewellState({ resetAlpha: false });
    graceRushFadeTimer = 0;
    graceRushFadeDuration = 0;
    graceRushFadeAlpha = 0;
    graceRushFadeHold = false;
    graceRushFadeReleaseTimer = 0;
    graceRushBlackout = false;
    graceRushHardBlackoutTimer = 0;
  }
  updateGraceRushFadeRelease(dt);
  updateLevelManagement();

  if (updatePlayerRespawn(dt)) {
    // Player respawn is in progress, continue with rest of update
  }

  if (handleTitleScreen()) {
    return;
  }

  if (handleVisitorSessionSkip()) {
    return;
  }

  if (handleVisitorSummary()) {
    return;
  }

  if (handleVisitorIntro()) {
    return;
  }

  if (
    levelAnnouncements.length &&
    levelAnnouncements[0]?.requiresConfirm &&
    Array.isArray(npcs) &&
    npcs.length
  ) {
    updateCozyNpcs(dt, { previewOnly: true });
  }

  if (handleLevelAnnouncements()) {
    return;
  }

  let stage = levelStatus?.stage;
  const congregationResult = updateCongregationStage(dt, levelStatus);
  const playerUpdatedDuringCongregation = congregationResult.updated;
  if (congregationResult.updated) {
    levelStatus = congregationResult.levelStatus;
    stage = levelStatus?.stage;
  }
  const congregationStageActive = stage === "levelIntro";

  const visualDt = dt;
  const freezeFrameActive = hitFreezeTimer > 0;
  updateCameraAndVisualEffects(visualDt);
  if (freezeFrameActive) {
    dt = 0;
  }

  if (handlePauseMenu()) {
    return;
  }

  if (gameOver) {
    player.animator.update(dt);
    if (wasActionJustPressed("restart")) restartGame();
    return;
  }

  if (paused) return;

  const blockingConfirmAnnouncement =
    Boolean(levelAnnouncements.length && levelAnnouncements[0]?.requiresConfirm);
  if (!gameOver && levelManager && !congregationStageActive && !blockingConfirmAnnouncement) {
    levelManager.update(dt);
    levelStatus = levelManager.getStatus ? levelManager.getStatus() : null;
    stage = levelStatus?.stage;
  }

  updateBattleVictoryNpcDialogue(dt);
  updateCongregationWaveIntroDialogue(dt, levelStatus);

  // Process pickups BEFORE player update so weapon changes apply immediately
  updateWeaponPickups(dt);
  updateChurchPowerupPickups(dt);
  updateUtilityPowerUps(dt);

  updatePlayer(dt, deathFreezeActive, playerUpdatedDuringCongregation);
  if (gameOver) return;
  resolveEntityObstacles(player);
  resolveEntityCollisions(player, enemies, { allowPush: false, overlapScale: 0.6 });
  clampEntityToBounds(player);

  if (visitorSession.active) {
    updateVisitorSession(dt);
    return;
  }

  updateEnemiesAndEntities(dt);
  updateRingOfFireHazards(dt);
  updatePrayerStormGroundFires(dt);

  if (player.shieldTimer > 0) {
    enemies.forEach((enemy) => {
      if (enemy.dead || enemy.state === "death") return;
      applyShieldImpact(enemy);
    });
  }

  if (activeBoss) {
    const bossDt = consumeEntityMeleeHitstopDt(activeBoss, dt);
    activeBoss.update(bossDt);
    if (activeBoss.removed) {
      activeBoss = null;
    }
  }

  updateHaloBlade(dt);
  updateCozyNpcs(dt);
  updateGracePickups(dt);
  updateSpearDart(dt);
  updateSentryTurret(dt);
  updateGraceHudFlyEffects(visualDt);
  updatePowerupHudFlyEffects(visualDt);
  updateGraceRushState(dt);
  powerUpRespawnTimer = Math.max(0, powerUpRespawnTimer - dt);
  powerUpStaggerTimer = Math.max(0, powerUpStaggerTimer - dt);
  const powerUpSpawnedThisFrame = processQueuedPowerUpDrops();
  // Ensure power-ups obey spawn rules per stage
  try {
    const stageName = levelStatus?.stage;
    const battleStageAllowsPowerUps =
      stageName === "waveIntro" ||
      stageName === "waveActive" ||
      stageName === "bossActive" ||
      stageName === "visitorMinigame";
    const powerUpsEnabled = typeof levelManager?.arePowerUpsEnabled === "function"
      ? levelManager.arePowerUpsEnabled()
      : true;
    const shouldEnsurePowerUp =
      !titleScreenActive &&
      !paused &&
      !gameOver &&
      player &&
      player.state !== "death" &&
      battleStageAllowsPowerUps &&
      powerUpsEnabled &&
      !congregationStageActive;
    const delayingForNpcProcession = stageName === "npcArrival" && npcProcessionActive;
    if (shouldEnsurePowerUp && !delayingForNpcProcession) {
      const queueBusy = queuedPowerUpDrops > 0;
      if (!powerUpSpawnedThisFrame && !queueBusy && powerUpStaggerTimer <= 0) {
        spawnNextEnsuredPowerUp();
      }
      // Church powerup runs on its own independent timer — completely separate from
      // the Utility/Weapon cycle so neither affects the other's timing.
      churchPowerupEnsureTimer = Math.max(0, churchPowerupEnsureTimer - dt);
      if (churchPowerupEnsureTimer <= 0) {
        if (getUnlockedChurchPowerupKeys().length > 0 && canSpawnChurchPowerup()) {
          spawnChurchPowerupPickup();
        }
        churchPowerupEnsureTimer = POWERUP_STAGGER_DELAY * 2;
      }
    }
  } catch (err) {
    console.warn && console.warn('ensure-powerup check failed', err);
  }
  updateBossHazards(dt);
  updateFloatingTexts(visualDt);
  updateLevelAnnouncements(dt);
  updateDevStatus(dt);
  updateAimAssist();
  updateEffects(visualDt);
  if (!levelManager?.isActive()) {
    maintainMiniImpHorde(levelStatus);
    maintainSkeletonHorde();
  }

  processDeadEnemies();


  comboTracker.update(
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now(),
  );
  const meleeSystemDt =
    window.__battlechurchPlayerMeleeHitstopActive
      ? 0
      : dt;
  updateMeleeAttackSystem(meleeSystemDt);

  processProjectileCollisions(dt);
  processProjectileClashing();
  cleanupDeadProjectiles();
}

function getFramesForClip(clip) {
  if (!clip || !clip.image) return [];
  const key = `${clip.image.src}::${clip.frameWidth}x${clip.frameHeight}`;
  if (devFrameCache.has(key)) return devFrameCache.get(key);
  const frames = [];
  const cols = Math.max(1, Math.floor(clip.image.width / clip.frameWidth));
  const rows = Math.max(1, Math.floor(clip.image.height / clip.frameHeight));
  const total = clip.frameCount || cols * rows;
  for (let i = 0; i < total; i += 1) {
    const sx = (i % cols) * clip.frameWidth;
    const sy = Math.floor(i / cols) * clip.frameHeight;
    const canvasFrame = document.createElement('canvas');
    canvasFrame.width = clip.frameWidth;
    canvasFrame.height = clip.frameHeight;
    const fctx = canvasFrame.getContext('2d');
    fctx.drawImage(clip.image, sx, sy, clip.frameWidth, clip.frameHeight, 0, 0, clip.frameWidth, clip.frameHeight);
    frames.push(canvasFrame);
  }
  devFrameCache.set(key, frames);
  return frames;
}

// Utility: draw rounded rectangle (optional fill/stroke)
function roundRect(ctx, x, y, width, height, radius, fill = true, stroke = true) {
  if (typeof radius === 'number') radius = { tl: radius, tr: radius, br: radius, bl: radius };
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function drawHUD() {
  // Rendering handled by renderer.js
}

function drawMissionBriefInArena() {
  // Rendering handled by renderer.js
}

function drawPauseHint() {
  // Rendering handled by renderer.js
}

function drawStartPrompt() {
  // Rendering handled by renderer.js
}

function drawGameOver() {
  // Rendering handled by renderer.js
}

function triggerPostDeathMiniSwarm() {
  if (!window.Spawner?.spawnMiniImpGroup) return;
  const groupCount = 36;
  for (let i = 0; i < 3; i += 1) {
    window.Spawner.spawnMiniImpGroup(groupCount);
  }
}

function onPlayerDeath() {
  heroLives -= 1;
  if (heroLives > 0) {
    if (!playerRespawnPending) {
      playerRespawnPending = true;
      respawnTimer = RESPAWN_DELAY;
      respawnIndicatorTimer = 0;
      if (player) {
        addStatusText(player, "Exhausted", {
          color: "#FF6B6B",
          bgColor: "rgba(60, 20, 20, 0.88)",
          life: Math.min(0.6, RESPAWN_STATUS_INTERVAL),
          offsetY: player.radius + 34,
        });
      }
    }


    damageHitFlash = 0;
    return;
  }
  heroLives = 0;
  playPlayerDeathBell(1.0);
  playerRespawnPending = false;
  respawnTimer = 0;
  respawnIndicatorTimer = 0;
  postDeathSequenceActive = true;
  postDeathTimer = POST_DEATH_HANG;
  miniImpWaveDispatched = false;
  arenaFadeTimer = -1;
  arenaFadeAlpha = 0;
  window.shouldShowGameOverMessage = false;
  console.log("Death sequence triggered: hang", POST_DEATH_HANG);
  if (player) {
    player.lockedPosition = { x: player.x, y: player.y };
  }
  gameOver = false;
  paused = false;
  damageHitFlash = 0;
}


function restartGame() {
  teardownGame();
  endVisitorSession({ reason: "reset" });
  resetMusicState();
  stopPlayerDeathBell();
  prayerBombRainTimer = 0;
  prayerBombRainSpawnTimer = 0;
  prayerStormGroundFireTargetThisCast = 0;
  prayerStormGroundFireSpawnedThisCast = 0;
  prayerStormRainImpactCountThisCast = 0;
  prayerStormGroundFireNextSpawnAtImpact = Infinity;
  prayerStormGroundFireImpactSpacing = Infinity;
  resetCongregationSize();
  resetYearNpcPool();
  enemies.splice(0, enemies.length);
  projectiles.splice(0, projectiles.length);
  weaponPickups.splice(0, weaponPickups.length);
  churchPowerupPickups.splice(0, churchPowerupPickups.length);
  utilityPowerUps.splice(0, utilityPowerUps.length);
  ringOfFireHazards.splice(0, ringOfFireHazards.length);
  prayerStormGroundFires.splice(0, prayerStormGroundFires.length);
  clearGracePickups();
  resetChurchPowerups();
  playerGraceCount = 0;
  Spawner.resetAllFlags();
  Effects.clear();
  bossHazards.splice(0, bossHazards.length);
  activeBoss = null;
  graceRushState.active = false;
  graceRushState.timer = 0;
  graceRushState.duration = 0;
  graceRushState.elapsed = 0;
  resetGraceRushNpcFarewellState();
  lastEnemyDeathPosition = null;
  cancelStartCountdown();
  needsCountdown = false;
  hpFlashTimer = 0;
  spawnTimer = 3.6;
  gameOver = false;
  paused = true;
  gameStarted = false;
  npcsSuspended = false;
  playerRespawnPending = false;
  respawnTimer = 0;
  respawnIndicatorTimer = 0;
  postDeathSequenceActive = false;
  postDeathTimer = 0;
  miniImpWaveDispatched = false;
  arenaFadeTimer = 0;
  arenaFadeAlpha = 0;
  actBreakFadeTimer = 0;
  actBreakFadeDuration = 0;
  actBreakFadeAlpha = 0;
  chapterBreakActive = false;
  chapterBreakActNumber = 2;
  chapterBreakImage = null;
  lastCompletedLevel = 0;
  graceRushFadeTimer = 0;
  graceRushFadeDuration = 0;
  graceRushFadeAlpha = 0;
  graceRushFadeHold = false;
  graceRushFadeReleaseTimer = 0;
  graceRushBlackout = false;
  npcWeaponState.mode = null;
  npcWeaponState.timer = 0;
  npcWeaponState.duration = 0;
  npcWeaponState.damageMultiplier = 1;
  npcWeaponState.cooldownMultiplier = 1;
  npcWeaponState.speedMultiplier = 1;
  floatingTexts.forEach((ft) => {
    if (!ft.critical) ft.life = 0;
  });
  player = createPlayerInstance(
    canvas.width / 2,
    HUD_HEIGHT + (canvas.height - HUD_HEIGHT) * 0.5 - 100,
    assets.player,
  );
  player.health = player.maxHealth;
  heroLives = getConfiguredHeroLives();
  resetCozyNpcs(5);
  clearCongregationMembers();
  heroRescueCooldown = 0;
  levelAnnouncements.length = 0;
  weaponPickupAnnouncement.timer = 0;
  weaponPickupAnnouncement.title = "";
  weaponPickupAnnouncement.description = "";
  npcHarmonyBuffTimer = 0;
  npcHarmonyBuffDuration = 0;
  levelManager = Levels.createLevelManager();
  levelManager.begin();
  titleScreenActive = true;
  titleDemoSaveMenuActive = false;
  paused = true;
  gameStarted = false;
  congregationOverlay.active = false;
  congregationOverlay.timer = 0;
  congregationOverlay.phase = 0;
  congregationOverlay.countTo = 0;
  congregationOverlay.countValue = 0;
  congregationOverlay.lastPhase = -1;
  congregationOverlay.playedFinal = false;
  congregationGreetingShown = false;
  congregationWelcomeTimer = 0;
  congregationGreetingCount = 0;
  speedrunTimer.running = false;
  speedrunTimer.startTime = null;
  speedrunTimer.sectionStart = null;
  speedrunTimer.currentSection = null;
  speedrunTimer.totalElapsed = 0;
  speedrunTimer.sectionElapsed = 0;
  speedrunTimer.splits = [];
  if (typeof Input !== "undefined" && typeof Input.initialize === "function") {
    Input.initialize({ canvas });
  }
  startGameLoop();
}

function gameLoop(timestamp) {
  const delta = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  if (typeof window !== "undefined") {
    window.__battlechurchTitleScreenActive = Boolean(titleScreenActive);
    window.__battlechurchPauseMenuActive = Boolean(window.isPauseOverlayActive);
    window.__battlechurchMapScreenActive = Boolean(mapActive);
  }

  if (typeof Input?.pollGamepad === "function") {
    Input.pollGamepad();
  }
  updateGame(delta);
  Renderer.drawFrame();
  if (window.UpgradeScreen?.isVisible?.()) {
    window.UpgradeScreen.draw();
  }
  keysJustPressed.clear();

  gameLoopHandle = requestAnimationFrame(gameLoop);
}

function stopGameLoop() {
  if (gameLoopHandle !== null) {
    cancelAnimationFrame(gameLoopHandle);
    gameLoopHandle = null;
  }
  gameLoopStarted = false;
}

function startGameLoop() {
  if (gameLoopStarted) {
    return;
  }
  stopGameLoop();
  gameLoopStarted = true;
  lastTime = performance.now();
  gameLoopHandle = requestAnimationFrame(gameLoop);
}

function teardownGame() {
  stopGameLoop();
  if (typeof Input !== "undefined" && typeof Input.detachListeners === "function") {
    Input.detachListeners();
  }
}

// Debug overlay functions (DEV-ONLY)
function toggleDebugOverlay() {
  if (!DEBUG) return;
  debugOverlayVisible = !debugOverlayVisible;
  if (debugOverlayVisible && !debugOverlayData) {
    updateDebugOverlayData();
  }
}

function updateDebugOverlayData() {
  if (!DEBUG || !debugOverlayVisible) return;

  // Calculate FPS from last frame delta
  const fps = lastTime > 0 ? Math.round(1000 / (performance.now() - lastTime)) : 0;

  // Get heap memory if available (Chrome)
  let heapUsed = "N/A";
  let heapTotal = "N/A";
  if (typeof performance !== "undefined" && performance.memory) {
    heapUsed = (performance.memory.usedJSHeapSize / 1048576).toFixed(1);
    heapTotal = (performance.memory.totalJSHeapSize / 1048576).toFixed(1);
  }

  // Count audio pools
  const audioPools = [
    arrowSfxPool, enemyHitSfxPool, enemyDeathSfxPool, swordSfxPool,
    swordKillSfxPool, fireballSfxPool, wisdomSfxPool, faithCannonSfxPool,
    powerupPickupSfxPool, wisdomHitSfxPool, faithHitSfxPool, prayerBombSfxPool,
    prayerBombRainSfxPool, bossDeathExplosionSfxPool, menuSelectSfxPool, enemySpawnSfxPool, gracePickupSfxPool,
    visitorHitSfxPool, chattyHitSfxPool, visitorSavedSfxPool, npcHurtSfxPool,
    playerHurtSfxPool
  ];
  const totalAudioInstances = audioPools.reduce((sum, pool) => sum + pool.length, 0);

  debugOverlayData = {
    fps,
    heapUsed,
    heapTotal,
    enemies: enemies.length,
    npcs: npcs.length,
    projectiles: projectiles.length,
    gracePickups: gracePickups.length,
    weaponPickups: weaponPickups.length,
    churchPowerupPickups: churchPowerupPickups.length,
    utilityPowerUps: utilityPowerUps.length,
    effects: effects.length,
    floatingTexts: floatingTexts.length,
    audioPools: audioPools.length,
    audioInstances: totalAudioInstances,
    audioCreatedTotal: audioCreatedTotal
  };
}

function renderDebugOverlay(ctx) {
  if (!DEBUG || !debugOverlayVisible || !debugOverlayData) return;

  const data = debugOverlayData;
  const x = canvas.width - 10;
  const startY = 20;
  const lineHeight = 16;
  const fontSize = 12;

  ctx.save();
  ctx.font = `${fontSize}px monospace`;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";

  const lines = [
    `FPS: ${data.fps}`,
    `Heap: ${data.heapUsed} / ${data.heapTotal} MB`,
    `Enemies: ${data.enemies}`,
    `NPCs: ${data.npcs}`,
    `Projectiles: ${data.projectiles}`,
    `Grace: ${data.gracePickups}`,
    `Weapons: ${data.weaponPickups}`,
    `Upgrades: ${data.churchPowerupPickups}`,
    `Powerups: ${data.utilityPowerUps}`,
    `Effects: ${data.effects}`,
    `Texts: ${data.floatingTexts}`,
    `Audio Pools: ${data.audioPools}`,
    `Audio Instances: ${data.audioInstances}`,
    `Audio Created (total): ${data.audioCreatedTotal}`
  ];

  lines.forEach((line, i) => {
    const y = startY + i * lineHeight;
    // Shadow for readability
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillText(line, x + 1, y + 1);
    // Text
    ctx.fillStyle = "#00ff00";
    ctx.fillText(line, x, y);
  });

  ctx.restore();
}

async function init() {
  try {
    resetMusicState();
    if (typeof window !== "undefined") startMusicOnFirstClick();
    resetCongregationSize();
    // Ensure canvas is sized before drawing
    resizeCanvas();

    // TWO-PHASE LOADING: Load title/map assets first for faster initial display
    // Phase 1: Load title background and map-essential assets
    const { assets: titleMapAssets, cache } = await loadTitleMapAssets();
    assets = titleMapAssets;
    mapReady = true; // Title screen and map navigation can now work

    // Give MapScreen the partial assets so map animations work
    if (window.MapScreen?.setAssets) {
      window.MapScreen.setAssets(assets);
    }

    startGameLoop();

    // Phase 2: Load remaining gameplay assets in background
    gameplayAssetsPromise = loadGameplayAssets(cache, assets);

    // Wait for gameplay assets before allowing actual gameplay
    await gameplayAssetsPromise;
    assetsLoaded = true;
    if (window.BattlechurchEnemyEditor?.initialize) {
      window.BattlechurchEnemyEditor.initialize({
        getAssets: () => assets,
      });
    }
    if (window.BattlechurchLevelBuilder?.initialize) {
      window.BattlechurchLevelBuilder.initialize({
        getAssets: () => assets,
      });
    }
    if (window.BattlechurchBossHitboxEditor?.initialize) {
      window.BattlechurchBossHitboxEditor.initialize({
        getAssets: () => assets,
        getEnemyCatalog: () => ENEMY_CATALOG,
        getEnemyTypes: () => ENEMY_TYPES,
        onHitboxChange: applyHitboxChange,
      });
    }
    if (window.BattlechurchHitboxEditor?.initialize) {
      window.BattlechurchHitboxEditor.initialize({
        getAssets: () => assets,
        getEnemyCatalog: () => ENEMY_CATALOG,
        getEnemyTypes: () => ENEMY_TYPES,
        getPlayerPreview: () => player,
        getPlayerConfig: () => PLAYER_CONFIG,
        getNpcPreview: () => (Array.isArray(npcs) ? npcs.find((npc) => npc && !npc.departed) || null : null),
        getProjectileConfig: () => PROJECTILE_CONFIG,
        onHitboxChange: applyHitboxChange,
        onPlayerHitboxChange: (hitbox) => {
          if (!hitbox || !Number.isFinite(hitbox.width) || !Number.isFinite(hitbox.height)) return;
          if (hitbox.width <= 0 || hitbox.height <= 0) return;
          const next = {
            width: hitbox.width,
            height: hitbox.height,
            offsetX: Number.isFinite(hitbox.offsetX) ? hitbox.offsetX : 0,
            offsetY: Number.isFinite(hitbox.offsetY) ? hitbox.offsetY : 0,
          };
          PLAYER_CONFIG.hitbox = { ...next };
          BASE_PLAYER_CONFIG.hitbox = { ...next };
          const derivedRadius = Math.max(next.width, next.height) * 0.5;
          PLAYER_CONFIG.radius = derivedRadius;
          BASE_PLAYER_CONFIG.radius = derivedRadius;
          saveStoredPlayerHitbox(next);
          if (player) {
            player.radius = derivedRadius;
            if (player.config) {
              player.config.radius = derivedRadius;
              player.config.hitbox = { ...next };
            }
          }
        },
        onPlayerWeaponHitboxChange: (weaponHitbox) => {
          if (!weaponHitbox || !Number.isFinite(weaponHitbox.width) || !Number.isFinite(weaponHitbox.height)) return;
          if (weaponHitbox.width <= 0 || weaponHitbox.height <= 0) return;
          const next = {
            width: weaponHitbox.width,
            height: weaponHitbox.height,
            offsetX: Number.isFinite(weaponHitbox.offsetX) ? weaponHitbox.offsetX : 0,
            offsetY: Number.isFinite(weaponHitbox.offsetY) ? weaponHitbox.offsetY : 0,
          };
          PLAYER_CONFIG.weaponHitbox = { ...next };
          BASE_PLAYER_CONFIG.weaponHitbox = { ...next };
          if (player?.config) {
            player.config.weaponHitbox = { ...next };
          }
        },
        onPlayerDashSlashHitboxChange: (dashSlashHitbox) => {
          if (!dashSlashHitbox || !Number.isFinite(dashSlashHitbox.width) || !Number.isFinite(dashSlashHitbox.height)) return;
          if (dashSlashHitbox.width <= 0 || dashSlashHitbox.height <= 0) return;
          const next = {
            width: dashSlashHitbox.width,
            height: dashSlashHitbox.height,
            offsetX: Number.isFinite(dashSlashHitbox.offsetX) ? dashSlashHitbox.offsetX : 0,
            offsetY: Number.isFinite(dashSlashHitbox.offsetY) ? dashSlashHitbox.offsetY : 0,
          };
          PLAYER_CONFIG.dashSlashHitbox = { ...next };
          BASE_PLAYER_CONFIG.dashSlashHitbox = { ...next };
          if (player?.config) {
            player.config.dashSlashHitbox = { ...next };
          }
        },
        onPlayerRushHitboxChange: (rushHitbox) => {
          if (!rushHitbox || !Number.isFinite(rushHitbox.width) || !Number.isFinite(rushHitbox.height)) return;
          if (rushHitbox.width <= 0 || rushHitbox.height <= 0) return;
          const next = {
            width: rushHitbox.width,
            height: rushHitbox.height,
            offsetX: Number.isFinite(rushHitbox.offsetX) ? rushHitbox.offsetX : 0,
            offsetY: Number.isFinite(rushHitbox.offsetY) ? rushHitbox.offsetY : 0,
          };
          PLAYER_CONFIG.rushHitbox = { ...next };
          BASE_PLAYER_CONFIG.rushHitbox = { ...next };
          if (player?.config) {
            player.config.rushHitbox = { ...next };
          }
        },
        onPlayerAttackHitFrameChange: (attackHitFrame) => {
          const next = Number.isFinite(attackHitFrame) ? Math.max(1, Math.round(attackHitFrame)) : DEFAULT_PLAYER_ATTACK_HIT_FRAME;
          PLAYER_CONFIG.attackHitFrame = next;
          BASE_PLAYER_CONFIG.attackHitFrame = next;
          if (player?.config) {
            player.config.attackHitFrame = next;
          }
        },
        onNpcRadiusChange: (radius) => {
          if (!Number.isFinite(radius) || radius <= 0 || !Array.isArray(npcs)) return;
          npcs.forEach((npc) => {
            if (!npc || npc.departed) return;
            npc.radius = radius;
          });
        },
        onProjectileRadiusChange: (type, radius) => {
          if (!type || !Number.isFinite(radius) || radius <= 0) return;
          const config = PROJECTILE_CONFIG[type];
          if (config && typeof config === "object") {
            config.radius = radius;
          }
          if (Array.isArray(projectiles)) {
            projectiles.forEach((projectile) => {
              if (!projectile || projectile.dead || projectile.type !== type) return;
              projectile.radius = radius;
            });
          }
        },
      });
    }
    rebuildObstacles();
  player = createPlayerInstance(
    canvas.width / 2,
    HUD_HEIGHT + (canvas.height - HUD_HEIGHT) * 0.5 - 100,
    assets.player,
  );
  player.health = player.maxHealth;
    heroLives = getConfiguredHeroLives();
    playerRespawnPending = false;
    respawnTimer = 0;
    respawnIndicatorTimer = 0;
    utilityPowerUps.length = 0;
    ringOfFireHazards.length = 0;
    prayerStormGroundFires.length = 0;
    prayerStormGroundFireTargetThisCast = 0;
    prayerStormGroundFireSpawnedThisCast = 0;
    prayerStormRainImpactCountThisCast = 0;
    prayerStormGroundFireNextSpawnAtImpact = Infinity;
    prayerStormGroundFireImpactSpacing = Infinity;
    resetCozyNpcs(5);
    clearCongregationMembers();
    spawnTimer = 3.8;
    cancelStartCountdown();
    needsCountdown = false;
    gameStarted = false;
    paused = true;
    hpFlashTimer = 0;
    heroRescueCooldown = 0;
    lastTime = performance.now();
    levelAnnouncements.length = 0;
    weaponPickupAnnouncement.timer = 0;
    weaponPickupAnnouncement.title = "";
    weaponPickupAnnouncement.description = "";
    npcHarmonyBuffTimer = 0;
    npcHarmonyBuffDuration = 0;
    npcWeaponState.mode = null;
    npcWeaponState.timer = 0;
    npcWeaponState.duration = 0;
    npcWeaponState.damageMultiplier = 1;
    npcWeaponState.cooldownMultiplier = 1;
    npcWeaponState.speedMultiplier = 1;
    bossHazards.length = 0;
    activeBoss = null;
    npcsSuspended = false;
    titleScreenActive = true;
    titleDemoSaveMenuActive = false;
    paused = true;
    gameStarted = false;
    levelManager = Levels.createLevelManager();
    levelManager.begin();
  // Re-apply explicit miniDemonFireThrower frameMaps after clip loading so they take effect
  try {
    if (assets?.enemies?.miniDemonFireThrower) {
      applyExplicitEnemyFrameMaps("miniDemonFireThrower", assets.enemies.miniDemonFireThrower);
    }
    if (assets?.enemies?.miniDemonLord) {
      applyExplicitEnemyFrameMaps("miniDemonLord", assets.enemies.miniDemonLord);
    }
    if (assets?.enemies?.bossDemonLord) {
      applyExplicitEnemyFrameMaps("bossDemonLord", assets.enemies.bossDemonLord);
    }
  } catch (e) {
    // ignore
  }
  } catch (error) {
    console.error(error);
    ctx.save();
    ctx.fillStyle = "#0b0e16";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#FF6B6B";
    ctx.font = `28px ${UI_FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.fillText("Failed to start Battlefield Church", canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillStyle = "#f3f5ff";
    ctx.font = `16px ${UI_FONT_FAMILY}`;
    const message = (error && error.message) || "Unknown error";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2 + 12);
    ctx.restore();
  }
}

init();

// Stop game loop when page is hidden to prevent resource leaks
if (typeof document !== "undefined" && document.addEventListener) {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopGameLoop();
    } else if (!titleScreenActive && !gameOver) {
      startGameLoop();
    }
  });
}
