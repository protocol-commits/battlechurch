/* Top-down adventure sandbox | Version 2025-10-30b */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
const gameWrapper = document.getElementById("gameWrapper");
const touchControlsRoot = document.getElementById("touchControls");
const moveStickBase = document.getElementById("moveStick");
const aimStickBase = document.getElementById("aimStick");
const virtualSpaceButton = document.getElementById("virtualSpaceButton");

let assets = null;
let player = null;
const enemies = [];
const projectiles = [];
const obstacles = [];
const animals = [];
const utilityPowerUps = [];
const keyPickups = [];
const POWERUP_RESPAWN_DELAY = 5;
const POWERUP_ACTIVE_LIFETIME = 8;
const POWERUP_BLINK_DURATION = 2;
const POWERUP_SPAWN_BLINK_DURATION = 1.2;
let powerUpRespawnTimer = 0;
let playerKeyCount = 0;
const KEY_PICKUP_RADIUS = 18;
const KEY_PICKUP_FRAME_DURATION = 0.08;
const KEY_PICKUP_LIFETIME = 8;
const KEY_PICKUP_ATTRACT_DISTANCE = 170;
const KEY_PICKUP_ATTRACT_FORCE = 460;
const KEY_PICKUP_GRAVITY = 520;
const KEY_PICKUP_AIR_DRAG = 0.88;
const KEY_PICKUP_FLOOR_Y = () => canvas.height - 36;
const KEY_DROP_BASE_CHANCE = 0.18;
const KEY_DROP_HIGH_VALUE_BONUS = 0.12;
const KEY_DROP_MINION_SCALE = 0.35;
const KEY_DROP_MAX_STACK = 3;
const KEY_DROP_SIZE_CHANCE_FACTOR = 0.15; // additional chance per relative size unit
const KEY_DROP_SIZE_STACK_FACTOR = 0.9; // extra stacks per size bucket
const KEY_RUSH_DURATION = 5;
const POST_DEATH_HANG = 5;
const ARENA_FADE_DURATION = 2;
let postDeathSequenceActive = false;
let postDeathTimer = 0;
let miniImpWaveDispatched = false;
let arenaFadeTimer = 0;
let arenaFadeAlpha = 0;
let damageHitFlash = 0;
const DAMAGE_HIT_FLASH_DURATION = 0.08;
if (typeof window !== "undefined" && !window.triggerDamageFlash) {
  window.triggerDamageFlash = () => {
    damageHitFlash = DAMAGE_HIT_FLASH_DURATION;
  };
}
const npcs = [];
const effects = Effects.getActive();
let divineChargeSparkEffect = null;
const ambientDecor = [];
let backgroundImage = null;
const levelAnnouncements = [];
let levelManager = null;
let activeBoss = null;
const bossHazards = [];
let titleScreenActive = true;
const devStatus = { text: "", timer: 0 };
let evacuatedNpcCount = 0;
let npcsSuspended = false;
const congregationMembers = [];
let congregationWanderBounds = null;
let npcProcessionActive = false;
const CONGREGATION_MEMBER_RADIUS = 26;
const CONGREGATION_MEMBER_COUNT = 50;
const INITIAL_CONGREGATION_SIZE = CONGREGATION_MEMBER_COUNT;
const NPC_PROCESSION_SPEED_MULTIPLIER = 3.5;
let congregationSize = INITIAL_CONGREGATION_SIZE;
const NPC_PROCESSION_ENTRY_MARGIN = 220;
const VISITOR_GUEST_COUNT = 10;
const VISITOR_SESSION_DURATION = 60;
const VISITOR_GUEST_MAX_FAITH = 10;
const VISITOR_BLOCKER_HITS_REQUIRED = 5;
const HEART_FAITH_PER_HIT = 1;
const VISITOR_BLOCKER_LINES =
  (typeof window !== "undefined" &&
    window.BattlechurchVisitorBlocker &&
    window.BattlechurchVisitorBlocker.blockerLines) ||
  [];
const KEY_SPRITE_ROOT = "assets/sprites/dungeon-assets/items/keys";
const TORCH_SPRITE_ROOT = "assets/sprites/dungeon-assets/items/torch";
const FLAG_SPRITE_ROOT = "assets/sprites/dungeon-assets/items/flag";

function spawnDivineChargeSparkVisual() {
  if (!player) return null;
  const frames = assets?.effects?.divineChargeSpark;
  if (!Array.isArray(frames) || !frames.length) return null;
  if (divineChargeSparkEffect && !divineChargeSparkEffect.dead) return divineChargeSparkEffect;
  const x = player.x;
  const y = player.y - (player.radius || 24) - DIVINE_CHARGE_SPARK_OFFSET;
  divineChargeSparkEffect = Effects.spawnLoopingEffect(frames, x, y, {
    frameDuration: DIVINE_CHARGE_SPARK_FRAME_DURATION,
    scale: DIVINE_CHARGE_SPARK_SCALE,
  });
  return divineChargeSparkEffect;
}

function updateDivineChargeSparkVisual() {
  if (!divineChargeSparkEffect || divineChargeSparkEffect.dead || !player) return;
  divineChargeSparkEffect.x = player.x;
  divineChargeSparkEffect.y = player.y - (player.radius || 24) - DIVINE_CHARGE_SPARK_OFFSET;
}

function clearDivineChargeSparkVisual() {
  if (!divineChargeSparkEffect) return;
  divineChargeSparkEffect.dead = true;
  divineChargeSparkEffect = null;
}
const KEY_SPRITE_FILES = [
  `${KEY_SPRITE_ROOT}/keys_1_1.png`,
  `${KEY_SPRITE_ROOT}/keys_1_2.png`,
  `${KEY_SPRITE_ROOT}/keys_1_3.png`,
  `${KEY_SPRITE_ROOT}/keys_1_4.png`,
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
};
const keyRushState = {
  active: false,
  timer: 0,
  duration: 0,
  reason: "battle",
  spawnTimer: 0,
  spawnInterval: 1,
  burstAmount: 16,
  centerX: null,
  centerY: null,
};
let lastEnemyDeathPosition = null;
visitorSession.activeChatty = new Set();
visitorSession.lockingBlockers = new Set();
visitorSession.movementLock = false;

function isPlayerMovementLocked() {
  return Boolean(visitorSession.active && visitorSession.movementLock);
}

if (typeof window !== "undefined") {
  window.Battlechurch = window.Battlechurch || {};
  window.Battlechurch.isPlayerMovementLocked = isPlayerMovementLocked;
}
let heroLives = 3;
let enemyDevLabelsVisible = true;
const devTools = {
  godMode: false,
  showCombatDebug: false,
  enemyHpBarThreshold: 100,
  // Adjustable runtime tuning for NPC combat behaviour
  npcFireCooldown: 1.2, // seconds between NPC arrow shots when at full faith
  npcFaithPerEnemy: 0, // faith gained by NPCs per enemy defeated
};
const MAX_ACTIVE_ENEMIES = 120;
const SKELETON_MIN_COUNT = 4;
const SKELETON_PACK_SIZE = 4;
const MINI_IMP_BASE_GROUP_SIZE = 48;
const MINI_IMP_MAX_GROUP_SIZE = 120;
const MINI_IMP_MIN_GROUPS_PER_HORDE = 1;
const ENEMY_GROUP_SPAWN_STAGGER_MS = 80;
const RESPAWN_DELAY = 2.5;
const RESPAWN_STATUS_INTERVAL = 0.5;
const RESPAWN_SHIELD_DURATION = 6;
let playerRespawnPending = false;
let respawnTimer = 0;
let respawnIndicatorTimer = 0;
// track auto-spawn of MiniFolks for level 1 so only one appears automatically
let lastLevelNumber = null;
// track whether one automatic enemy has spawned on level 1

function getNpcHomeBounds() {
  const centerX = canvas.width / 2;
  const centerY = (canvas.height + HUD_HEIGHT) / 2;
  const spreadX = Math.max(120, canvas.width * 0.18);
  const spreadY = Math.max(120, (canvas.height - HUD_HEIGHT) * 0.18);
  const minX = Math.max(NPC_RADIUS + 40, centerX - spreadX);
  const maxX = Math.min(canvas.width - NPC_RADIUS - 40, centerX + spreadX);
  const minY = Math.max(HUD_HEIGHT + NPC_RADIUS + 30, centerY - spreadY);
  const maxY = Math.min(canvas.height - NPC_RADIUS - 40, centerY + spreadY);
  return { minX, maxX, minY, maxY };
}

function getActiveUtilityPowerUpCount() {
  return utilityPowerUps.filter((p) => p && !p.collected && !p.dead).length;
}

function canSpawnUtilityPowerUp() {
  return getActiveUtilityPowerUpCount() < 1 && powerUpRespawnTimer <= 0;
}

function getActiveWeaponPowerUpCount() {
  return animals.filter((animal) => animal && animal.effect && isWeaponPowerEffect(animal.effect)).length;
}

function canSpawnWeaponPowerUp() {
  return getActiveWeaponPowerUpCount() < 1 && powerUpRespawnTimer <= 0;
}

function triggerPowerUpCooldown() {
  powerUpRespawnTimer = POWERUP_RESPAWN_DELAY;
}

function clearAllPowerUps() {
  animals.forEach((animal) => {
    if (!animal) return;
    animal.active = false;
    animal.expired = true;
    animal.visible = false;
    animal.life = 0;
  });
  animals.splice(0, animals.length);
  utilityPowerUps.forEach((powerUp) => {
    if (!powerUp) return;
    powerUp.active = false;
    powerUp.expired = true;
    powerUp.visible = false;
    powerUp.life = 0;
  });
  utilityPowerUps.splice(0, utilityPowerUps.length);
  powerUpRespawnTimer = 0;
}

function clearKeyPickups() {
  keyPickups.splice(0, keyPickups.length);
}

function getKeyCount() {
  return playerKeyCount;
}

let npcHarmonyBuffTimer = 0;
const HARMONY_BUFF_MULTIPLIER = 1.5;

function addKeys(amount = 1) {
  if (!Number.isFinite(amount) || amount === 0) return playerKeyCount;
  playerKeyCount = Math.max(0, Math.round(playerKeyCount + amount));
  return playerKeyCount;
}

function startBattleKeyRush(duration = KEY_RUSH_DURATION, options = {}) {
  keyRushState.active = true;
  keyRushState.timer = Math.max(0, duration);
  keyRushState.duration = Math.max(0, duration);
  keyRushState.reason = options.reason || "battle";
  keyRushState.burstAmount = Math.max(1, Math.round(options.burstAmount ?? (keyRushState.reason === "boss" ? 26 : 16)));
  keyRushState.spawnInterval = Math.max(
    0.2,
    Number.isFinite(options.spawnInterval) ? options.spawnInterval : keyRushState.reason === "boss" ? 0.65 : 1.1,
  );
  keyRushState.spawnTimer = 0;
  keyRushState.centerX = Number.isFinite(options.centerX) ? options.centerX : null;
  keyRushState.centerY = Number.isFinite(options.centerY) ? options.centerY : null;
  lastEnemyDeathPosition = null;
}

function updateKeyRushState(dt) {
  if (!keyRushState.active) return;
  const levelStatus = levelManager?.getStatus ? levelManager.getStatus() : null;
  if (levelStatus?.stage !== "keyRush") {
    keyRushState.active = false;
    keyRushState.timer = 0;
    keyRushState.spawnTimer = 0;
    keyRushState.centerX = null;
    keyRushState.centerY = null;
    return;
  }
  keyRushState.timer = Math.max(0, keyRushState.timer - dt);
  keyRushState.spawnTimer = (keyRushState.spawnTimer || 0) - dt;
  if (keyRushState.spawnTimer <= 0) {
    spawnVictoryKeyBurst({
      reason: keyRushState.reason,
      amount: keyRushState.burstAmount,
      centerX: keyRushState.centerX,
      centerY: keyRushState.centerY,
    });
    keyRushState.spawnTimer = keyRushState.spawnInterval;
  }
  if (keyRushState.timer <= 0) {
    keyRushState.active = false;
    keyRushState.timer = 0;
    keyRushState.spawnTimer = 0;
    keyRushState.centerX = null;
    keyRushState.centerY = null;
  }
}

function getLastEnemyDeathPosition() {
  if (!lastEnemyDeathPosition) return null;
  return { ...lastEnemyDeathPosition };
}

let projectileFrames = {};
const assetSrcResolutionCache = new Map();

let paused = false;
let howToPlayActive = false;

let score = 0;
let spawnTimer = 0;
let gameOver = false;
let lastTime = performance.now();
paused = true;
let hpFlashTimer = 0;
let hitFreezeTimer = 0;
let cameraShakeTimer = 0;
let cameraShakeMagnitude = 0;

function applyCameraShake(duration, magnitude) {
  if (duration <= 0 || magnitude <= 0) return;
  if (cameraShakeTimer <= 0 || magnitude > cameraShakeMagnitude) {
    cameraShakeTimer = Math.max(cameraShakeTimer, duration);
    cameraShakeMagnitude = magnitude;
  }
}
// per-layer pan values used by drawBackground
let backgroundPan = { far: { x: 0 }, mid: { x: 0 } };
// Developer animation inspector
// Developer animation inspector
let devInspectorActive = false;
let devInspectorIndex = 0;
let devInspectorTimer = 0;
const DEV_INSPECTOR_PLAY_SPEED = 1.0; // speed multiplier
const devFrameCache = new Map(); // cache extracted frames per clip
let devInspectorZoom = 1.0; // default zoom for inspector (1.0 = fit-to-panel)
let lastInspectorClick = null; // { key, col, row, globalIndex, time }
// Overrides created via the inspector: per-key mapping of states to selected frame indices
const devInspectorOverrides = {}; // { key: { idle: { frames: [0,1,2] }, ... } }
let canvasScale = 1;

FloatingText.initialize({
  getPlayer: () => player,
});

const floatingTexts = FloatingText.getActive();
const addFloatingText = FloatingText.add;
const addFloatingTextAt = FloatingText.addAt;
const showDamage = FloatingText.showDamage;
const heroSay = FloatingText.heroSay;
const npcCheer = FloatingText.npcCheer;
const vampireTaunt = FloatingText.vampireTaunt;
const addStatusText = FloatingText.addStatusText;
const updateFloatingTexts = FloatingText.update;

Effects.initialize({
  context: ctx,
  getAssets: () => assets,
});

const updateEffects = Effects.update;
const spawnImpactEffect = Effects.spawnImpactEffect;
const spawnFlashEffect = Effects.spawnFlashEffect;
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

function mergeInspectorOverrides(source) {
  if (!source || typeof source !== 'object') return;
  Object.keys(source).forEach((key) => {
    const states = source[key];
    if (!states || typeof states !== 'object') return;
    const target = devInspectorOverrides[key] = devInspectorOverrides[key] || {};
    Object.keys(states).forEach((state) => {
      const data = states[state];
      if (!data || typeof data !== 'object') return;
      const existing = target[state] || {};
      const next = Object.assign({}, existing, data);
      if (Array.isArray(data.frames)) next.frames = data.frames.slice();
      target[state] = next;
    });
  });
  markOverridesDirty();
  try {
    console.info && console.info('mergeInspectorOverrides: merged keys', Object.keys(source || {}));
  } catch (e) {}
}

function mergeManualGridOverrides(source) {
  if (!source || typeof source !== 'object') return;
  devManualGridOverrides = devManualGridOverrides || {};
  Object.keys(source).forEach((name) => {
    const def = source[name];
    if (!def || typeof def !== 'object') return;
    const cols = parseInt(def.cols, 10);
    const rows = parseInt(def.rows, 10);
    if (!Number.isFinite(cols) || cols <= 0) return;
    if (!Number.isFinite(rows) || rows <= 0) return;
    const key = String(name || '').trim().toLowerCase();
    if (!key) return;
    devManualGridOverrides[key] = { cols, rows };
  });
  try {
    saveDevManualGridOverrides();
    console.info && console.info('mergeManualGridOverrides: applied grids for', Object.keys(source || {}));
  } catch (e) {
    console.warn('mergeManualGridOverrides: failed to persist manual grids', e);
  }
}

async function applyInspectorOverrides() {
  try {
    const keys = Object.keys(devInspectorOverrides || {});
    if (!keys.length) return;
    for (const key of keys) {
      const override = devInspectorOverrides[key];
      if (!override || typeof override !== 'object') continue;
      if (ASSET_MANIFEST.enemies?.[key]) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await reloadEnemyClipsForKey(key);
          console.info && console.info('applyInspectorOverrides: reloaded enemy', key, override);
        } catch (e) {
          console.warn('applyInspectorOverrides: failed reloading enemy', key, e);
        }
      } else if (ASSET_MANIFEST.projectiles?.[key]) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await reloadProjectileClipForKey(key);
          console.info && console.info('applyInspectorOverrides: reloaded projectile', key, override);
        } catch (e) {
          console.warn('applyInspectorOverrides: failed reloading projectile', key, e);
        }
      }
    }
  } catch (e) {
    console.warn('applyInspectorOverrides: unexpected error', e);
  }
}
// Pick-flow state: when inspector opens we will prompt the user for each state in order
const devInspectorStatesOrder = ['idle','walk','attack','hurt','death'];
let devInspectorFlowActive = false; // true when asking user to pick frames state-by-state
let devInspectorCurrentStateIndex = 0; // index into devInspectorStatesOrder
let devInspectorSelectedState = null; // convenience name for current state during flow
let heroRescueCooldown = 0;
// Persistence for inspector overrides
const DEV_OVERRIDES_STORAGE_KEY = 'devInspectorOverrides_v1';
let devOverridesDirty = false;
let devOverridesSaveTimer = 0;
// Manual grid overrides entered at runtime by the developer inspector: { filename: { cols: n, rows: m } }
const DEV_MANUAL_GRID_KEY = 'devManualGridOverrides_v1';
let devManualGridOverrides = {};

const DEV_WEAPON_SHEETS = [
  { projectileKey: 'arrow', label: 'Weapon: MiniFireBall (Arrow)' },
  { projectileKey: 'weaponMiniLichSpell', label: 'Weapon: MiniLichSpell' },
  { projectileKey: 'weaponMiniTrident', label: 'Weapon: MiniTrident' },
];

function getDevInspectorTargets() {
  const enemyTargets = MINIFOLKS
    .map((m) => ({ key: m.key, label: m.key, kind: 'enemy' }))
    .filter((entry) => assets.enemies?.[entry.key]);
  const weaponTargets = DEV_WEAPON_SHEETS
    .map((w) => ({ key: w.projectileKey, label: w.label, kind: 'weapon' }))
    .filter((entry) => assets.projectiles?.[entry.key]);
  return enemyTargets.concat(weaponTargets);
}

function getInspectorStateList(target) {
  if (!target) return devInspectorStatesOrder;
  if (target.kind === 'weapon') return ['walk'];
  return devInspectorStatesOrder;
}

function ensureInspectorState(target) {
  const states = getInspectorStateList(target);
  if (!states.includes(devInspectorSelectedState)) {
    devInspectorSelectedState = states[0] || null;
  }
  return states;
}

function getInspectorClipBundle(target) {
  if (!target) return {};
  if (target.kind === 'enemy') {
    return assets.enemies?.[target.key] || {};
  }
  if (target.kind === 'weapon') {
    const clip = assets.projectiles?.[target.key];
    if (!clip) return {};
    return { walk: clip };
  }
  return {};
}

function loadDevManualGridOverrides() {
  try {
    const raw = localStorage.getItem(DEV_MANUAL_GRID_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      // normalize keys to lowercase basenames
      devManualGridOverrides = {};
      for (const [k, v] of Object.entries(parsed)) {
        const nk = String(k || '').trim().toLowerCase();
        devManualGridOverrides[nk] = v;
      }
      setDevStatus('Manual grid overrides loaded', 1.6);
    }
  } catch (e) {
    console.warn('Failed to load manual grid overrides', e);
  }
}

function saveDevManualGridOverrides() {
  try {
    // normalize keys when persisting
    const out = {};
    for (const [k, v] of Object.entries(devManualGridOverrides)) {
      out[String(k).trim().toLowerCase()] = v;
    }
    localStorage.setItem(DEV_MANUAL_GRID_KEY, JSON.stringify(out));
    setDevStatus('Manual grid overrides saved', 1.4);
  } catch (e) {
    console.warn('Failed to save manual grid overrides', e);
    setDevStatus('Failed saving manual grid overrides', 2.2);
  }
}

function saveDevOverrides(silent = false) {
  try {
    localStorage.setItem(DEV_OVERRIDES_STORAGE_KEY, JSON.stringify(devInspectorOverrides));
    devOverridesDirty = false;
    devOverridesSaveTimer = 0;
    if (!silent) setDevStatus('Overrides saved to localStorage', 1.4);
  } catch (e) {
    console.warn('Failed to save overrides', e);
    setDevStatus('Failed to save overrides', 2.2);
  }
}

function loadDevOverrides() {
  try {
    const raw = localStorage.getItem(DEV_OVERRIDES_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      // copy into existing object
      Object.keys(parsed).forEach((k) => {
        devInspectorOverrides[k] = parsed[k];
      });
      setDevStatus('Overrides loaded from localStorage', 1.6);
      return true;
    }
  } catch (e) {
    console.warn('Failed to load overrides', e);
  }
  return false;
}
  let devOverridesAutoDownload = false; // if true, downloads JSON file on save

function markOverridesDirty() {
  devOverridesDirty = true;
  devOverridesSaveTimer = 0;
}

function exportDevOverridesToClipboard() {
  try {
    const text = JSON.stringify(devInspectorOverrides, null, 2);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setDevStatus('Overrides copied to clipboard', 1.6);
      }, () => {
        console.debug && console.debug('Overrides export (clipboard unavailable)');
      });
    } else {
      console.debug && console.debug('Overrides export (no clipboard available)');
    }
  } catch (e) {
    console.warn('Export failed', e);
    setDevStatus('Export failed', 2.2);
  }
}
  function downloadDevOverridesFile() {
    try {
      const text = JSON.stringify(devInspectorOverrides, null, 2);
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `dev-overrides-${ts}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDevStatus('Overrides downloaded', 1.6);
    } catch (e) {
      console.warn('Download failed', e);
      setDevStatus('Download failed', 2.2);
    }
  }

function importDevOverridesFromText(text) {
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object') {
      Object.keys(parsed).forEach((k) => {
        devInspectorOverrides[k] = parsed[k];
      });
      markOverridesDirty();
      setDevStatus('Overrides imported', 1.6);
      return true;
    }
  } catch (e) {
    console.warn('Import failed', e);
  }
  setDevStatus('Import failed (invalid JSON)', 2.6);
  return false;
}

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
const CANVAS_BASE_WIDTH = 1280;
const CANVAS_BASE_HEIGHT = 720;
const HUD_HEIGHT = 43;
const UI_FONT_FAMILY = "'Orbitron', sans-serif";
const BASE_ASPECT_RATIO = CANVAS_BASE_WIDTH / CANVAS_BASE_HEIGHT;
const TARGET_ASPECT_RATIO = (typeof window !== 'undefined' && window.__BATTLECHURCH_ASPECT_RATIO !== undefined)
  ? Number(window.__BATTLECHURCH_ASPECT_RATIO) || BASE_ASPECT_RATIO
  : BASE_ASPECT_RATIO;
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
const PRAYER_BOMB_RADIUS = 520 * WORLD_SCALE;
const PRAYER_BOMB_DAMAGE_MULTIPLIER = 12.0;
const PRAYER_BOMB_CHARGE_REQUIRED = 60;
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
const DAMAGE_FLASH_DURATION = 0.24;
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
const COIN_COOLDOWN = projectileSettings.coinCooldown ?? 0.4;
const PROJECTILE_CONFIG = projectileSettings.config || {};
const HEART_PROJECTILE_SRC =
  projectileSettings.heartProjectileSrc || "assets/sprites/cute-valley/Collectible/heart_2.png";
const PROJECTILE_PATH =
  projectileSettings.projectilePath || "assets/sprites/rpg-sprites/";
const MAGIC_PACK_ROOT =
  projectileSettings.magicPackRoot || "assets/sprites/magic-pack/sprites";
const MAGIC_FIREBALL_SPRITE_PATH = `${MAGIC_PACK_ROOT}/fireball/sprites`;
const MAGIC_FLASH_SPRITE_PATH = `${MAGIC_PACK_ROOT}/flash/sprites`;
const POWERUP_PLAYFIELD_MARGIN = 140;
const CONRAD_UTILITY_POWERUP_MAX_HEIGHT = 48 * WORLD_SCALE;
function resizeCanvas() {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scaleWidth = viewportWidth / CANVAS_BASE_WIDTH;
  const scaleHeight = viewportHeight / CANVAS_BASE_HEIGHT;
  canvasScale = Math.max(0.1, Math.min(scaleWidth, scaleHeight));

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
    document.documentElement.style.setProperty('--game-width', `${cssWidth}px`);
    document.documentElement.style.setProperty('--game-height', `${cssHeight}px`);
  }

  if (!pointerState.active) {
    pointerState.x = CANVAS_BASE_WIDTH / 2;
    pointerState.y = CANVAS_BASE_HEIGHT / 2;
  }

  positionObstacles();
  positionAmbientDecor();
  if (player) {
    resolveEntityObstacles(player);
    player.clampToBounds();
  }
  enemies.forEach((enemy) => {
    if (enemy?.spawnOffscreenTimer > 0) return;
    resolveEntityObstacles(enemy);
    clampEntityToBounds(enemy);
  });
  animals.forEach((animal) => {
    resolveEntityObstacles(animal);
    clampEntityToBounds(animal);
  });
  Input.updateTouchLayout();
}

let gameStarted = false;
let titleDialogActive = false;
let pauseDialogActive = false;

Input.initialize({
  canvas,
  touchControlsRoot,
  moveStickBase,
  aimStickBase,
  virtualSpaceButton,
  onAnyKeyDown: (key) => {
    if (key === "k") {
      addKeys(500);
      setDevStatus("Dev: +500 keys");
    }
    if (!gameStarted && !paused) gameStarted = true;
  },
  shouldUpdatePointer: () => Boolean(player),
  shouldHandleInspectorClick: () => devInspectorActive,
  onInspectorClick: (coords) => {
    if (!coords) return;
    handleInspectorClick(coords.x, coords.y);
  },
});

const pointerState = Input.pointerState;
const aimState = Input.aimState;
const virtualInput = Input.virtualInput;
const keysJustPressed = Input.keysJustPressed;
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
const isActionActive = Input.isActionActive;
const wasActionJustPressed = Input.wasActionJustPressed;
const consumePrayerBombClick = Input.consumePrayerBombClick;
const aimAssist = {
  target: null,
  vertices: null,
  targetKind: null,
};
const SHOW_ENEMY_SPAWN_DEBUG = false;
Renderer.initialize({
  get canvas() { return canvas; },
  get ctx() { return ctx; },
  levelAnnouncements,
  HUD_HEIGHT,
  UI_FONT_FAMILY,
  bossHazards,
  SHOW_ENEMY_SPAWN_DEBUG,
  getEnemySpawnPoints,
  congregationMembers,
  getMonthName,
  get assets() { return assets; },
  get cameraOffsetX() { return cameraOffsetX; },
  get cameraShakeTimer() { return cameraShakeTimer; },
  CAMERA_SHAKE_DURATION,
  get cameraShakeMagnitude() { return cameraShakeMagnitude; },
  get titleScreenActive() { return titleScreenActive; },
  get howToPlayActive() { return howToPlayActive; },
  get levelManager() { return levelManager; },
  get gameOver() { return gameOver; },
  obstacles,
  npcs,
  utilityPowerUps,
  animals,
  keyPickups,
  enemies,
  get activeBoss() { return activeBoss; },
  projectiles,
  get visitorSession() { return visitorSession; },
  get player() { return player; },
  getCongregationSize,
  initialCongregationSize: INITIAL_CONGREGATION_SIZE,
  get cannonSplashRadius() { return FAITH_CANNON_SPLASH_RADIUS; },
  effects,
  floatingTexts,
  pointerState,
  get paused() { return paused; },
  get devInspectorActive() { return devInspectorActive; },
  drawDevInspector,
  getStartCountdownLabel,
  aimState,
  aimAssist,
  get keyRushState() { return keyRushState; },
  getKeyCount: () => getKeyCount(),
  WORLD_SCALE,
  get damageHitFlash() { return damageHitFlash; },
  get postDeathSequenceActive() { return postDeathSequenceActive; },
  get heroLives() { return heroLives; },
  get hpFlashTimer() { return hpFlashTimer; },
  get gameStarted() { return gameStarted; },
  get isModalActive() { return isAnyDialogActive(); },
  get arenaFadeAlpha() { return arenaFadeAlpha; },
});
function bootInputAndResize() {
  resizeCanvas();
  Input.updateTouchLayout();
}

if (document.readyState === "complete" || document.readyState === "interactive") {
  setTimeout(bootInputAndResize, 0);
} else {
  window.addEventListener("load", bootInputAndResize);
}

window.addEventListener("resize", () => {
  resizeCanvas();
  Input.updateTouchLayout();
}, { passive: true });

function handleInspectorClick(cx, cy) {
  const targets = getDevInspectorTargets();
  if (!targets.length) {
    console.warn('handleInspectorClick: no inspectable assets available');
    return;
  }
  devInspectorIndex = devInspectorIndex % targets.length;
  const target = targets[devInspectorIndex];
  ensureInspectorState(target);
  const key = target.key;
  const clips = getInspectorClipBundle(target);
  const clip = clips.walk || clips.idle || Object.values(clips)[0];
  if (!clip) {
    console.warn('handleInspectorClick: no clip for key', key, clips);
    return;
  }
  if (!clip.image || !Number.isFinite(clip.frameWidth) || clip.frameWidth <= 0 || !Number.isFinite(clip.frameHeight) || clip.frameHeight <= 0) {
    console.warn('handleInspectorClick: clip frame size invalid, aborting click handling', { key, clip });
    setDevStatus('Sprite not ready: frame size unknown', 1.8);
    return;
  }

  const cols = Math.max(1, Math.floor(clip.image.width / clip.frameWidth));
  const rows = Math.max(1, Math.floor(clip.image.height / clip.frameHeight));
  const padding = 18;
  const panelW = Math.min(1200, canvas.width - 80);
  const panelH = Math.min(860, canvas.height - 80);
  const px = (canvas.width - panelW) / 2;
  const py = (canvas.height - panelH) / 2;
  const gridPadding = 8;
  const availableW = panelW - padding * 2;
  const availableH = panelH - 120;
  const frameW = clip.frameWidth;
  const frameH = clip.frameHeight;
  const maxScaleX = Math.floor(availableW / (frameW * cols + gridPadding * (cols - 1)) * 100) / 100 || 1;
  const maxScaleY = Math.floor(availableH / (frameH * rows + gridPadding * (rows - 1)) * 100) / 100 || 1;
  const scale = Math.max(0.2, Math.min(maxScaleX, maxScaleY));
  const cellW = Math.floor(frameW * scale);
  const cellH = Math.floor(frameH * scale);
  const gridW = cols * cellW + Math.max(0, cols - 1) * gridPadding;
  const gridH = rows * cellH + Math.max(0, rows - 1) * gridPadding;
  const gridX = px + (panelW - gridW) / 2;
  const gridY = py + 64;

  const btnW = 88;
  const btnH = 28;
  const btnY = py + 16;
  const prevX = px + panelW - padding - btnW * 4 - 16;
  const nextX = px + panelW - padding - btnW * 3 - 12;
  const gridBtnX = px + panelW - padding - btnW * 2 - 8;
  const typeX = px + panelW - padding - btnW;

  const selectPrevTarget = () => {
    if (!targets.length) return;
    devInspectorIndex = (devInspectorIndex - 1 + targets.length) % targets.length;
    const nextTarget = targets[devInspectorIndex];
    ensureInspectorState(nextTarget);
    setDevStatus(`Inspector: ${nextTarget.label}`, 1.4);
  };
  const selectNextTarget = () => {
    if (!targets.length) return;
    devInspectorIndex = (devInspectorIndex + 1) % targets.length;
    const nextTarget = targets[devInspectorIndex];
    ensureInspectorState(nextTarget);
    setDevStatus(`Inspector: ${nextTarget.label}`, 1.4);
  };

  if (cx >= prevX && cx <= prevX + btnW && cy >= btnY && cy <= btnY + btnH) {
    selectPrevTarget();
    return;
  }
  if (cx >= nextX && cx <= nextX + btnW && cy >= btnY && cy <= btnY + btnH) {
    selectNextTarget();
    return;
  }

  if (cx >= gridBtnX && cx <= gridBtnX + btnW && cy >= btnY && cy <= btnY + btnH) {
    const stateList = ensureInspectorState(target);
    const targetState = devInspectorFlowActive ? (stateList[devInspectorCurrentStateIndex] || stateList[0] || 'walk') : (devInspectorSelectedState || stateList[0] || 'walk');
    showFrameEntryUI(key, 'grid', (raw) => {
      if (raw === null) {
        setDevStatus('Grid entry cancelled', 1.2);
        return;
      }
      const m = String(raw).trim().match(/^(\d+)\s*[xX,\s]\s*(\d+)$/);
      if (!m) {
        setDevStatus('Invalid grid format. Use e.g. 4x4', 2.6);
        return;
      }
      const cols = Math.max(1, parseInt(m[1], 10));
      const rows = Math.max(1, parseInt(m[2], 10));
      const srcBaseRaw = (clip?.image?.src || '').split('/').pop() || '';
      const srcBase = String(srcBaseRaw).trim();
      const nsrc = srcBase.toLowerCase();
      devManualGridOverrides[nsrc] = { cols, rows };
      saveDevManualGridOverrides();
      const reloadPromise = target.kind === 'weapon'
        ? reloadProjectileClipForKey(key)
        : reloadEnemyClipsForKey(key);
      reloadPromise.then(() => {
        setDevStatus(`Set grid ${cols}x${rows} for ${srcBase}`, 2.4);
        markOverridesDirty();
      }).catch(() => {
        console.warn('reload clip failed', { key });
        setDevStatus('Failed to reload sprite after grid change', 2.6);
      });
    });
    return;
  }

  if (cx >= typeX && cx <= typeX + btnW && cy >= btnY && cy <= btnY + btnH) {
    const stateList = ensureInspectorState(target);
    const targetState = devInspectorFlowActive
      ? (stateList[devInspectorCurrentStateIndex] || stateList[0] || 'walk')
      : (devInspectorSelectedState || stateList[0] || 'walk');
    showFrameEntryUI(key, targetState, (raw) => {
      if (raw === null) {
        setDevStatus('Frame entry cancelled', 1.2);
        return;
      }
      const frames = parseFrameList(raw);
      if (frames.length) {
        devInspectorOverrides[key] = devInspectorOverrides[key] || {};
        devInspectorOverrides[key][targetState] = { frames: frames.map((i) => i - 1) };
        const reloadPromise = target.kind === 'weapon'
          ? reloadProjectileClipForKey(key)
          : reloadEnemyClipsForKey(key);
        reloadPromise.then(() => {
          markOverridesDirty();
          setDevStatus(`Set ${targetState} frames: [${frames.join(',')}] for ${target.label || key}`, 2.6);
        }).catch(() => {
          setDevStatus('Failed to reload sprite after grid change', 2.6);
        });
      } else {
        setDevStatus('No valid frames parsed', 1.6);
      }
    });
    return;
  }

  // Legend hit detection (allow clicking state legend at bottom to select state)
  const legendX = px + padding;
  const legendY = py + panelH - 40;
  let lx = legendX;
  for (const st of stateList) {
    // each legend entry uses ~120px horizontal space in drawDevInspector
    const lw = 120;
    if (cx >= lx && cx <= lx + lw && cy >= legendY - 18 && cy <= legendY + 6) {
      devInspectorSelectedState = st;
      setDevStatus(`Inspector target: ${st}`, 1.2);
      return;
    }
    lx += lw;
  }

  // Map click to cell
  if (cx < gridX || cx > gridX + gridW || cy < gridY || cy > gridY + gridH) {
    console.warn('handleInspectorClick: click outside grid', { cx, cy, gridX, gridY, gridW, gridH });
    return;
  }
  const relX = cx - gridX;
  const relY = cy - gridY;
  const col = Math.floor(relX / (cellW + gridPadding));
  const row = Math.floor(relY / (cellH + gridPadding));
  if (col < 0 || col >= cols || row < 0 || row >= rows) return;
  const globalIndex = row * cols + col;

  // Debug: log computed mapping to help diagnose click issues
    // inspector click mapping computed (silenced)

  // record for on-canvas highlight
  lastInspectorClick = { key, col, row, globalIndex, time: performance.now() };

  // determine which state to modify: if flow active, use current state; otherwise toggle for all or choose idle by default
  const keyOverrides = devInspectorOverrides[key] = devInspectorOverrides[key] || {};
  const targetState = devInspectorFlowActive
    ? (stateList[devInspectorCurrentStateIndex] || stateList[0] || 'walk')
    : (devInspectorSelectedState || stateList[0] || 'walk');
  keyOverrides[targetState] = keyOverrides[targetState] || { frames: [] };
  const arr = keyOverrides[targetState].frames;
  const idx = arr.indexOf(globalIndex);
  if (idx === -1) arr.push(globalIndex);
  else arr.splice(idx, 1);
  arr.sort((a,b)=>a-b);
  const reloadPromise = target.kind === 'weapon'
    ? reloadProjectileClipForKey(key)
    : reloadEnemyClipsForKey(key);
  reloadPromise.then(() => {
    markOverridesDirty();
    setDevStatus(`${targetState} frames: [${arr.map(i=>i+1).join(',')}]`, 1.6);
  }).catch(() => {
    setDevStatus('Failed to reload sprite after frame change', 2.2);
  });
}

const PLAYER_SPRITE_PATH = "assets/sprites/conrad/characters/";
const DECOR_PATH = "assets/sprites/cute-sprites/Outdoor decoration/";
const BACKGROUND_IMAGE_PATH = "assets/backgrounds/church-1108.png";
const BACKGROUND_FAR_PATH = "assets/backgrounds/far-bg.png";
const BACKGROUND_MID_PATH = "assets/backgrounds/mid-bg.png";
const BACKGROUND_FLOOR_PATH = "assets/backgrounds/background-6.png";
const TITLE_BACKGROUND_PATH = "assets/backgrounds/title.png";
const CHARACTER_ROOT = "assets/sprites/rpg-sprites/Characters(100x100)";
const ANIMAL_ROOT = "assets/sprites/cute-sprites/Animals";
const CUTE_VALLEY_COLLECTIBLE_ROOT = "assets/sprites/cute-valley/Collectible/";

const DECOR_CONFIG = (typeof window !== "undefined" && window.WorldDecor) || {};

const VALLEY_OBJECTS_PATH =
  DECOR_CONFIG.VALLEY_OBJECTS_PATH || "assets/sprites/cute-valley/Objects/";
const AMBIENT_CANDLE_COUNT =
  typeof DECOR_CONFIG.AMBIENT_CANDLE_COUNT === "number"
    ? DECOR_CONFIG.AMBIENT_CANDLE_COUNT
    : 4;
const AMBIENT_DECOR_MARGIN =
  typeof DECOR_CONFIG.AMBIENT_DECOR_MARGIN === "number"
    ? DECOR_CONFIG.AMBIENT_DECOR_MARGIN
    : 80;
const AMBIENT_CANDLE_FRAME_DURATION =
  typeof DECOR_CONFIG.AMBIENT_CANDLE_FRAME_DURATION === "number"
    ? DECOR_CONFIG.AMBIENT_CANDLE_FRAME_DURATION
    : 0.18;
const AMBIENT_CANDLE_EFFECT_SCALE =
  (typeof DECOR_CONFIG.AMBIENT_CANDLE_EFFECT_SCALE === "number"
    ? DECOR_CONFIG.AMBIENT_CANDLE_EFFECT_SCALE
    : 4.8) * WORLD_SCALE;
const AMBIENT_DECOR_COLLISION_PADDING =
  (typeof DECOR_CONFIG.AMBIENT_DECOR_COLLISION_PADDING === "number"
    ? DECOR_CONFIG.AMBIENT_DECOR_COLLISION_PADDING
    : 12) * WORLD_SCALE;

const RAW_OBSTACLE_DEFS = DECOR_CONFIG.OBSTACLE_DEFS || {};

const OBSTACLE_DEFS = Object.fromEntries(
  Object.entries(RAW_OBSTACLE_DEFS).map(([key, def]) => {
    const baseScale = typeof def.scale === "number" ? def.scale : 1;
    const baseRadius = typeof def.collisionRadius === "number" ? def.collisionRadius : 0;
    return [
      key,
      Object.assign({}, def, {
        scale: baseScale * WORLD_SCALE,
        collisionRadius: baseRadius * WORLD_SCALE,
      }),
    ];
  }),
);

const OBSTACLE_LAYOUT = Array.isArray(DECOR_CONFIG.OBSTACLE_LAYOUT)
  ? DECOR_CONFIG.OBSTACLE_LAYOUT.slice()
  : [];
const MAGIC_PACK7_ROOT = "assets/sprites/magic-pack-7/sprites";
const MAGIC_PACK10_ROOT = "assets/sprites/magic-pack-10/sprites";
const MAGIC_PACK10_SHEETS_ROOT = "assets/sprites/magic-pack-10/spritesheets";
const DIVINE_CHARGE_SPARK_ROOT = `${MAGIC_PACK10_ROOT}/Sparks`;
const DIVINE_CHARGE_SPARK_COUNT = 16;
const DIVINE_CHARGE_SPARK_FRAME_DURATION = 0.06;
const DIVINE_CHARGE_SPARK_SCALE = 1.5;
const DIVINE_CHARGE_SPARK_OFFSET = 18;
const MELEE_SWOOSH_PATH = "assets/sprites/conrad/actions/swoosh.png";
const WISDOM_FRAME_START = 9;
const WISDOM_FRAME_END = 18;
const WISDOM_FRAME_SOURCES = Array.from(
  { length: WISDOM_FRAME_END - WISDOM_FRAME_START + 1 },
  (_, index) => `${MAGIC_FIREBALL_SPRITE_PATH}/fireball${WISDOM_FRAME_START + index}.png`,
); // Wisdom projectile uses frames 9-18 from the fireball sprite sheet.
const FLASH_FRAME_COUNT = 14;
const UTILITY_POWERUP_ROOT = "assets/sprites/dungeon-assets/items";
const COIN_FRAME_DURATION = 0.08;
const PROJECTILE_FRAME_DURATIONS = {
  fire: 0.05,
  wisdom_missle: 0.05,
  faith_cannon: 0.06,
  coin: COIN_FRAME_DURATION,
  heart: 0.08,
};
const NPC_COZY_ROOT = "assets/sprites/npcs-cozy";
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
const NPC_FAITH_KILL_REWARD_EXCLUSIONS = new Set(["miniGhost"]); // enemy kills that should not reward NPC faith
const NPC_ARROW_COOLDOWN_DEFAULT = 1.2; // default seconds between NPC shots
const NPC_ARROW_RANGE_DEFAULT = 520; // maximum range NPC will attempt to shoot
const NPC_ARROW_DAMAGE = 10; // damage dealt by NPC arrows
const NPC_MAX_FAITH_LOSS_PER_ATTACK = 25;
// make faith bars slightly smaller and closer to the NPC for better layout
const NPC_FAITH_BAR_WIDTH = 40;
const NPC_FAITH_BAR_HEIGHT = 7;
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
const NPC_DAMAGE_COOLDOWN_EXCEPTIONS = ["vampire", "ghost"];

// Vampire taunts removed

const npcDialogue =
  (typeof window !== "undefined" && window.BattlechurchNpcDialogue) || {};
const NPC_STRUGGLE_LINES = npcDialogue.struggleLines || [];
const NPC_RETURN_LINES = npcDialogue.returnLines || [];

function isNoCooldownDamageSource(type) {
  if (!type) return false;
  const normalized = String(type).toLowerCase();
  return NPC_DAMAGE_COOLDOWN_EXCEPTIONS.some((token) => normalized.includes(token));
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getMonthName(levelNumber) {
  if (!Number.isFinite(levelNumber) || levelNumber <= 0) return "January";
  return MONTH_NAMES[(levelNumber - 1) % MONTH_NAMES.length];
}

const COIN_ASSET_ROOT = "assets/sprites/dungeon-assets/items/coin";
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
  const cfg =
    (typeof DEV_LEVEL_BUILDER?.getConfig === "function" && DEV_LEVEL_BUILDER.getConfig()) ||
    (typeof DEV_ENEMY_EDITOR?.getConfig === "function" && DEV_ENEMY_EDITOR.getConfig()) ||
    null;
  if (!cfg?.globals?.enemyStats) return baseDefs;
  const overrides = cfg.globals.enemyStats;
  const merged = {};
  Object.keys(baseDefs || {}).forEach((key) => {
    const base = baseDefs[key] || {};
    const ov = overrides[key];
    if (!ov) {
      merged[key] = base;
    } else {
      merged[key] = Object.assign({}, base, ov);
    }
  });
  return merged;
}

const ENEMY_DEFINITIONS =
  applyDevEnemyOverrides(
    (typeof window !== "undefined" && window.BattlechurchEnemyDefinitions) ||
      ENEMY_CATALOG,
  );


// MiniFolk enemies: demons/skellies that run through `spawner` overrides, e.g. miniGhost prefers NPCs, miniDemonLord is bulkier, and the undead minis reuse the same sheet for every state.
const MINIFOLKS =
  (typeof window !== "undefined" && window.BattlechurchMiniFolks?.list) ||
  [];

const powerupDefinitions =
  (typeof window !== "undefined" && window.BattlechurchPowerupDefinitions) ||
  {};
const WEAPON_DROP_DEFS = powerupDefinitions.weaponDropDefs || {};
const UTILITY_POWERUP_DEFS = powerupDefinitions.utilityPowerupDefs || {};

const ASSET_MANIFEST =
  window.BattlechurchAssetManifest?.build?.({
    playerSpritePath: PLAYER_SPRITE_PATH,
    projectilePath: PROJECTILE_PATH,
    magicPackRoot: MAGIC_PACK_ROOT,
    heartProjectileSrc: HEART_PROJECTILE_SRC,
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
  ASSET_MANIFEST.enemies[mini.key] = {
    idle: {
      src: mini.src,
      frameWidth: 0,
      frameHeight: 0,
      frameRate: 8,
      loop: true,
    },
    walk: {
      src: mini.src,
      frameWidth: 0,
      frameHeight: 0,
      frameRate: 10,
      loop: true,
    },
    attack: {
      src: mini.src,
      frameWidth: 0,
      frameHeight: 0,
      frameRate: 12,
      loop: false,
    },
    hurt: {
      src: mini.src,
      frameWidth: 0,
      frameHeight: 0,
      frameRate: 10,
      loop: false,
    },
    death: {
      src: mini.src,
      frameWidth: 0,
      frameHeight: 0,
      frameRate: 10,
      loop: false,
    },
  };
}

const { AnimationClip, Animator } = window.Entities || {};
const PLAYER_BASE_SCALE = .9;
const PLAYER_SCALE = PLAYER_BASE_SCALE * WORLD_SCALE;
const PLAYER_COLLISION_RADIUS = 12;
const PLAYER_FRAME_SIZE = 100;

// small horizontal camera offset (world scroll) used to drive parallax
let cameraOffsetX = 0;
const CAMERA_SCROLL_LIMIT = 56; // reduced: subtle parallax only

const BASE_PLAYER_CONFIG = {
  scale: PLAYER_SCALE,
  speed: 260 * SPEED_SCALE,
  arrowCooldown: 0.35 / 2,
  maxHealth: HERO_MAX_HEALTH,
  radius: PLAYER_COLLISION_RADIUS * PLAYER_SCALE,
};

const ENTITIES_BOOTSTRAP = window.Entities?.initialize?.({
  WORLD_SCALE,
  PLAYER_BASE_SCALE,
  HERO_MAX_HEALTH,
  PRAYER_BOMB_CHARGE_REQUIRED,
  COIN_COOLDOWN,
  DAMAGE_FLASH_INTENSITY,
  PLAYER_BASE_CONFIG: BASE_PLAYER_CONFIG,
  ENEMY_DEFINITIONS,
});

const PLAYER_CONFIG = ENTITIES_BOOTSTRAP?.PLAYER_CONFIG || BASE_PLAYER_CONFIG;
const ENEMY_TYPES =
  ENTITIES_BOOTSTRAP?.ENEMY_TYPES || buildEnemyTypesFallback(ENEMY_DEFINITIONS);

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
const spawnMiniSkeletonGroup = Spawner.spawnMiniSkeletonGroup;
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
  spawnMiniSkeletonGroup,
  spawnPowerUpDrops,
  spawnBossForLevel,
  devClearOpponents,
  resetCozyNpcs,
  buildCongregationMembers,
  clearCongregationMembers,
  clearPowerUps: clearAllPowerUps,
  clearKeys: clearKeyPickups,
  spawnVictoryKeyBurst,
  startBattleKeyRush,
  getLastEnemyDeathPosition,
  spawnAnimals: spawnWeaponDrops,
  evacuateNpcsForBoss,
  restoreNpcsAfterBoss,
  heroSay,
  npcCheer,
  onNpcLost: handleNpcLostFromCongregation,
  prepareNpcProcession,
  isNpcProcessionComplete: areNpcProcessionsComplete,
  getAvailableMiniFolkKeys: () => MINIFOLKS.map((m) => m.key),
  hasEnemyAsset: (key) => Boolean(ASSET_MANIFEST.enemies?.[key]),
  miniImpBaseGroupSize: MINI_IMP_BASE_GROUP_SIZE,
  miniImpMaxGroupSize: MINI_IMP_MAX_GROUP_SIZE,
  miniImpMinGroupsPerHorde: MINI_IMP_MIN_GROUPS_PER_HORDE,
  getScore: () => score,
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
const WEAPON_POWERUP_EFFECTS = new Set(["wisdomWeapon", "scriptureWeapon", "cannonWeapon"]);
const weaponPowerupConfig = projectileSettings.weaponPowerups || {};

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
  };
}

function showWeaponPowerupConfigText(config) {
  showWeaponPowerupFloatingText(config.text, config.textColor || "#fff");
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

function buildEnemyTypesFallback(defs) {
  if (!defs || typeof defs !== "object") return {};
  return Object.fromEntries(
    Object.entries(defs).map(([key, def]) => {
      const scale = def.scale * WORLD_SCALE;
      const baseRadius = def.baseRadius || 14;
      const hitRadius = baseRadius * scale;
      const attackRange = def.attackRange ?? hitRadius + (def.attackBonus ?? 30);
      const displayName = def.displayName || def.folder || key;
      return [
        key,
        {
          speed: def.speed,
          health: def.health,
          maxHealth: def.health,
          damage: roundEnemyDamageToFive(def.damage),
          attackRange,
          hitRadius,
          attackCooldown: def.cooldown,
          scale,
          score: def.score,
          displayName,
          ranged: Boolean(def.ranged),
          projectileType: def.projectileType || null,
          preferEdges: Boolean(def.preferEdges),
          desiredRange: def.desiredRange || attackRange,
          projectileCooldown: def.projectileCooldown || def.cooldown,
        },
      ];
    }),
  );
}

const HEALTH_BAR_ROW_HITS = [3, 6, 12, 24, 48];
const HEALTH_BAR_COLORS = ["#ff4d4d", "#ff9f43", "#ffe66b", "#a8ff82", "#7de0ff"];

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
    let triedFallback = false;
    let fallbackSrc = null;

    const computeLowercaseFallback = (input) => {
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

    if (!cached) {
      const fallbackCandidate = computeLowercaseFallback(originalSrc);
      if (fallbackCandidate) fallbackSrc = withAssetVersion(fallbackCandidate);
    }

    image.onload = () => {
      if (!cached) {
        assetSrcResolutionCache.set(originalSrc, image.src);
      }
      resolve(image);
    };

    image.onerror = () => {
      if (!cached && !triedFallback && fallbackSrc && fallbackSrc !== image.src) {
        triedFallback = true;
        assetSrcResolutionCache.set(originalSrc, fallbackSrc);
        image.src = fallbackSrc;
        return;
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
    // use devImageCache so we don't double-download
      try {
        // If a runtime manual grid override exists for this src, compute explicit frame sizes
        const srcBaseRaw = (def.src || '').split('/').pop() || '';
        const nsrc = String(srcBaseRaw).trim().toLowerCase();
        const runtimeGrid = (devManualGridOverrides && devManualGridOverrides[nsrc]) || null;
        let useDef = def;
      if (runtimeGrid && runtimeGrid.cols && runtimeGrid.rows) {
          try {
            // create a shallow copy and inject explicit frameWidth/frameHeight
            const img = await loadCachedImage(devImageCache, def.src);
            const fw = Math.floor(img.width / Math.max(1, runtimeGrid.cols));
            const fh = Math.floor(img.height / Math.max(1, runtimeGrid.rows));
            useDef = Object.assign({}, def, { frameWidth: fw, frameHeight: fh });
          // runtime grid override applied (silenced)
          } catch (e) {
            console.warn('reloadEnemyClipsForKey: failed to load image for runtimeGrid override', def.src, e);
          }
        }
        const clip = await loadAnimationClip(useDef, devImageCache);
        // If developer-selected frames exist, attach them quietly (no logs)
        try {
          const overrides = devInspectorOverrides && devInspectorOverrides[key];
          if (overrides && overrides[state] && Array.isArray(overrides[state].frames) && overrides[state].frames.length) {
            clip.frameMap = overrides[state].frames.slice();
          }
        } catch (e) {
          // ignore
        }
        newClips[state] = clip;
  try { /* clip loaded (silenced) */ } catch(e) {}
      } catch (e) {
        console.warn('reloadEnemyClipsForKey: failed loading state', { key, state, def, e });
      }
  });
    await Promise.all(loaders);
    assets.enemies = assets.enemies || {};
    assets.enemies[key] = newClips;
    // Clear any cached extracted frames for images used by these clips so inspector will regenerate thumbnails
    try {
      for (const clipObj of Object.values(newClips)) {
        const anySrc = clipObj?.image?.src;
        if (!anySrc) continue;
        for (const k of Array.from(devFrameCache.keys())) {
          if (k.startsWith(anySrc)) devFrameCache.delete(k);
        }
      }
    } catch (e) {
      // ignore
    }
  // updated assets.enemies for key (silenced)
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
    let useDef = def;
    const srcBaseRaw = (def.src || '').split('/').pop() || '';
    const nsrc = String(srcBaseRaw).trim().toLowerCase();
    const runtimeGrid = devManualGridOverrides && devManualGridOverrides[nsrc];
    if (runtimeGrid && runtimeGrid.cols && runtimeGrid.rows) {
      try {
        const img = await loadCachedImage(devImageCache, def.src);
        const fw = Math.floor(img.width / Math.max(1, runtimeGrid.cols));
        const fh = Math.floor(img.height / Math.max(1, runtimeGrid.rows));
        useDef = Object.assign({}, def, { frameWidth: fw, frameHeight: fh });
      } catch (e) {
        console.warn('reloadProjectileClipForKey: failed to apply runtime grid override', def.src, e);
      }
    }
    const clip = await loadAnimationClip(useDef, devImageCache);
    try {
      const overrides = devInspectorOverrides && devInspectorOverrides[key];
      const walkOverride = overrides && overrides.walk;
      if (walkOverride && Array.isArray(walkOverride.frames) && walkOverride.frames.length) {
        clip.frameMap = walkOverride.frames.slice();
      }
    } catch (e) {
      // ignore override application issues
    }
    assets.projectiles = assets.projectiles || {};
    assets.projectiles[key] = clip;
    try {
      const anySrc = clip?.image?.src;
      if (anySrc) {
        for (const cacheKey of Array.from(devFrameCache.keys())) {
          if (cacheKey.startsWith(anySrc)) devFrameCache.delete(cacheKey);
        }
      }
    } catch (e) {}
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

    // Try runtime manual overrides (set by inspector) first, then static overrides
  const srcBase = (definition.src || "").split('/').pop() || "";
  const normalizedSrc = String(srcBase).trim().toLowerCase();
  const staticManualOverrides = {
  'MiniFireImp.png': { cols: 2, rows: 2 },
      'MiniHighDemon.png': { cols: 2, rows: 2 },
      'MiniDemonLord.png': { cols: 2, rows: 2 },
      'MiniDemonFireKeeper.png': { cols: 1, rows: 1 },
      'MiniSkeleton.png': { cols: 1, rows: 1 },
      'MiniZombie.png': { cols: 1, rows: 1 },
      'MiniZombieButcher.png': { cols: 4, rows: 4 },
  'minifireball.png': { cols: 4, rows: 2 },
  'minilichspell.png': { cols: 4, rows: 2 },
  'minitrident.png': { cols: 4, rows: 2 },
    };
    const runtimeOverride = devManualGridOverrides && devManualGridOverrides[normalizedSrc];
    const MANUAL_FRAME_OVERRIDES = runtimeOverride || staticManualOverrides;
    if (MANUAL_FRAME_OVERRIDES && (MANUAL_FRAME_OVERRIDES[normalizedSrc] || MANUAL_FRAME_OVERRIDES[srcBase])) {
      const mo = runtimeOverride || MANUAL_FRAME_OVERRIDES[normalizedSrc] || MANUAL_FRAME_OVERRIDES[srcBase];
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

// Vampire assets and logic removed per request

async function loadCoinAssets(cache) {
  const frameFiles = ["coin_1.png", "coin_2.png", "coin_3.png", "coin_4.png"];
  const frames = await Promise.all(
    frameFiles.map((file) => loadCachedImage(cache, `${COIN_ASSET_ROOT}/${file}`)),
  );
  return { coinFrames: frames };
}

async function loadAmbientDecorAssets(cache) {
  const candleSrc = `${VALLEY_OBJECTS_PATH}candle_1.png`;
  const image = await loadCachedImage(cache, candleSrc);
  const frames = extractFrames(image, 16, 16);
  return { candleFrames: frames };
}

async function loadAssets() {
  const cache = new Map();
  const assets = {
    player: {},
    projectiles: {},
    enemies: {},
    obstacles: {},
    animals: {},
    utility: {},
    effects: {},
  background: null,
  backgroundLayers: { far: null, mid: null, floor: null },
  npcs: null,
    vampire: null,
    items: {},
  };
  projectileFrames = {};
  const npcAssetsPromise = loadCozyNpcAssets(cache);
  const coinAssetsPromise = loadCoinAssets(cache);
  const ambientDecorPromise = loadAmbientDecorAssets(cache);
  const keyFramesPromise = Promise.all(
    KEY_SPRITE_FILES.map(async (src) => {
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
    [1, 2, 3, 4].map(async (idx) => {
      const src = `${TORCH_SPRITE_ROOT}/torch_${idx}.png`;
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
    }),
  );
  const flagFramesPromise = Promise.all(
    [1, 2, 3, 4].map(async (idx) => {
      const src = `${FLAG_SPRITE_ROOT}/flag_${idx}.png`;
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
    }),
  );

  const playerEntries = Object.entries(ASSET_MANIFEST.player).map(
    async ([key, def]) => {
      assets.player[key] = await loadAnimationClip(def, cache);
    },
  );

  const projectileEntries = Object.entries(ASSET_MANIFEST.projectiles).map(
    async ([key, def]) => {
      assets.projectiles[key] = await loadAnimationClip(def, cache);
    },
  );

  const enemyTypes = Object.entries(ASSET_MANIFEST.enemies).map(
    async ([enemyName, enemyDefs]) => {
      assets.enemies[enemyName] = {};
      const loaders = Object.entries(enemyDefs).map(async ([state, def]) => {
        const clip = await loadAnimationClip(def, cache);
        // If there are developer overrides for this key/state, they'll be
        // applied later via reloadEnemyClipsForKey during init(). But if the
        // overrides are missing and this is a MiniFolk, attach reasonable
        // default frameMaps so idle/walk don't cycle the entire sheet.
        assets.enemies[enemyName][state] = clip;
      });
      await Promise.all(loaders);
      // After clips loaded, apply default maps for MiniFolk when no overrides
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
          // Developer-provided explicit maps: ensure miniDemonFireThrower has proper idle/walk maps
          try {
            if (enemyName === 'miniDemonFireThrower' && assets.enemies[enemyName]) {
              // Frame Developer: grid 8x7, idle frames 1-4, walk frames 9-14 (1-based)
              const idleMap = [0, 1, 2, 3];
              const walkMap = [8, 9, 10, 11, 12, 13];
              if (assets.enemies[enemyName].idle) assets.enemies[enemyName].idle.frameMap = idleMap.slice();
              if (assets.enemies[enemyName].walk) assets.enemies[enemyName].walk.frameMap = walkMap.slice();
              console.info && console.info('Applied explicit frameMap for miniDemonFireThrower', { idleMap, walkMap });
            }
          } catch (e) {}
      } catch (e) {
        // ignore
      }
    },
  );

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
      assets.animals[key] = { image: imageRef, frames, ...def };
    },
  );

  const utilityEntries = Object.entries(UTILITY_POWERUP_DEFS).map(
    async ([key, def]) => {
      if (!cache.has(def.src)) {
        cache.set(def.src, loadImage(def.src));
      }
      const image = await cache.get(def.src);
      assets.utility[key] = { image, ...def };
    },
  );


  const backgroundPromise = loadImage(BACKGROUND_IMAGE_PATH)
    .then((image) => {
      assets.background = image;
    })
    .catch((error) => {
      console.error(error);
      assets.background = null;
    });

  // layered backgrounds (optional)
  const farPromise = loadImage(BACKGROUND_FAR_PATH)
    .then((img) => { assets.backgroundLayers.far = img; })
    .catch(() => { assets.backgroundLayers.far = null; });
  const midPromise = loadImage(BACKGROUND_MID_PATH)
    .then((img) => { assets.backgroundLayers.mid = img; })
    .catch(() => { assets.backgroundLayers.mid = null; });
  // Swap to use floor.png for the floor background
  const floorPromise = loadImage("assets/backgrounds/floor.png")
    .then((img) => { assets.backgroundLayers.floor = img; })
    .catch(() => { assets.backgroundLayers.floor = null; });


  const titleBackgroundPromise = loadImage(TITLE_BACKGROUND_PATH)
    .then((img) => { assets.titleBackground = img; })
    .catch(() => { assets.titleBackground = null; });
  await Promise.all([
    ...playerEntries,
    ...projectileEntries,
    ...enemyTypes,
    ...obstacleEntries,
    ...weaponDropEntries,
    ...utilityEntries,
    backgroundPromise,
  npcAssetsPromise,
  coinAssetsPromise,
  ambientDecorPromise,
  farPromise,
  midPromise,
    floorPromise,
    titleBackgroundPromise,
    
  ]);

  assets.npcs = await npcAssetsPromise;
  assets.items = await coinAssetsPromise;
  projectileFrames.coin = assets.items.coinFrames || [];
  if (assets.items.coinFrames?.length) {
    assets.projectiles.coin = { frames: assets.items.coinFrames };
  }

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

  const ambientDecorAssets = await ambientDecorPromise;
  assets.effects.candle = ambientDecorAssets.candleFrames || [];

  // Extract frames for miniFireball projectile (2 rows x 4 cols expected).
  try {
    const pclip = assets.projectiles?.miniFireball;
    if (pclip && pclip.image) {
      // Ensure we have usable frameWidth/frameHeight; if loader failed to infer,
      // apply a sensible fallback for the known miniFireball layout (4 cols x 2 rows).
      let frameW = pclip.frameWidth || 0;
      let frameH = pclip.frameHeight || 0;
      const imgW = pclip.image.width;
      const imgH = pclip.image.height;
      if ((!frameW || !frameH) && imgW > 0 && imgH > 0) {
        if (imgW % 4 === 0 && imgH % 2 === 0) {
          frameW = Math.floor(imgW / 4);
          frameH = Math.floor(imgH / 2);
        }
      }
      // Final guard: if still missing, attempt gcd fallback as a square-ish grid
      if ((!frameW || !frameH) && imgW > 0 && imgH > 0) {
        const g = gcd(imgW, imgH);
        if (g > 1) {
          frameW = frameW || g;
          frameH = frameH || g;
        }
      }

      if (frameW > 0 && frameH > 0) {
        const cols = Math.max(1, Math.floor(imgW / frameW));
        const rows = Math.max(1, Math.floor(imgH / frameH));
        const total = pclip.frameCount || cols * rows;
        projectileFrames.miniFireball = [];
        for (let i = 0; i < total; i += 1) {
          const frameCanvas = extractFrame(pclip.image, frameW, frameH, i);
          projectileFrames.miniFireball.push(frameCanvas);
        }
        // prefer using frames array for miniFireball
        if (projectileFrames.miniFireball.length) {
          assets.projectiles.miniFireball = { frames: projectileFrames.miniFireball };
        }
      } else {
        // log metadata to help debugging in the browser console
        console.debug && console.debug('miniFireball extraction skipped; metadata', {
          src: pclip.image?.src,
          imgW,
          imgH,
          frameWidth: pclip.frameWidth,
          frameHeight: pclip.frameHeight,
          inferredFrameW: frameW,
          inferredFrameH: frameH,
        });
      }
    }
  } catch (e) {
    // ignore frame extraction failures
  }

  assets.effects.verticalPuff = await Promise.all(
    Array.from({ length: 9 }, (_, i) =>
      loadImage(`${MAGIC_PACK_ROOT}/vertical-puff/sprites/vertical-puff${i + 1}.png`).then(
        (img) => extractFrame(img, img.width, img.height, 0),
      ),
    ),
  );
  assets.effects.impactDust = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      loadImage(`${MAGIC_PACK_ROOT}/impact-dust/sprites/impact-dust${i + 1}.png`).then((img) =>
        extractFrame(img, img.width, img.height, 0),
      ),
    ),
  );
  assets.effects.flash = await Promise.all(
    Array.from({ length: 14 }, (_, i) =>
      loadImage(`${MAGIC_PACK_ROOT}/flash/sprites/flash${i + 1}.png`).then((img) =>
        extractFrame(img, img.width, img.height, 0),
      ),
    ),
  );
  assets.effects.visitorHeartHit = await Promise.all(
    Array.from({ length: 6 }, (_, i) =>
      loadImage(`${MAGIC_PACK_ROOT}/puff/sprites/puff${i + 1}.png`).then((img) =>
        extractFrame(img, img.width, img.height, 0),
      ),
    ),
  );
  projectileFrames.fire = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      loadImage(`${MAGIC_PACK_ROOT}/fire-missile/sprites/fire-missile${i + 1}.png`),
    ),
  );
  projectileFrames.wisdom_missle = await Promise.all(
    WISDOM_FRAME_SOURCES.map((src) => loadImage(src)),
  ); // Projectile frames mirror the same Fireball9-18 set so the weapon/path lines up.
  assets.effects.magicImpact = await Promise.all(
    Array.from({ length: FLASH_FRAME_COUNT }, (_, i) =>
      loadImage(`${MAGIC_FLASH_SPRITE_PATH}/flash${i + 1}.png`),
    ),
  ); // Impact spark now uses the fireball flash sprites (flash1-14) instead of the legacy vfx-d pack.
  assets.effects.magicSplash = await Promise.all(
    Array.from({ length: FLASH_FRAME_COUNT }, (_, i) =>
      loadImage(`${MAGIC_FLASH_SPRITE_PATH}/flash${i + 1}.png`).then((img) =>
        extractFrame(img, img.width, img.height, 0),
      ),
    ),
  ); // Magic splash mirrors the flash hit frames so wisdom/faith hits show the same spark.
  assets.effects.chattyHeartHit = await loadImage(`${MAGIC_PACK10_SHEETS_ROOT}/ray.png`).then((img) =>
    extractFrames(img, 78, 64),
  );
  assets.effects.chattyAppease = await loadImage(`${MAGIC_PACK10_SHEETS_ROOT}/blast.png`).then((img) =>
    extractFrames(img, 64, 64),
  );
  assets.effects.raybolt = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      loadImage(`${MAGIC_PACK10_ROOT}/Raybolt/Raybolt${i + 1}.png`).then((img) =>
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
  assets.npcs = await npcAssetsPromise;
  const keyFrames = (await keyFramesPromise).filter(Boolean);
  assets.items.keyPickup = {
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
  // load smoke frames (magic-pack Smoke sprites)
  assets.effects.smoke = await Promise.all(
    Array.from({ length: 17 }, (_, i) =>
      loadImage(`${MAGIC_PACK_ROOT}/Smoke/sprites/smoke${i + 1}.png`).then((img) =>
        // frames are single images, keep as-is
        extractFrame(img, img.width, img.height, 0),
      ),
    ),
  );
  return assets;
}

// After the module loads, attempt to load any saved manual grid overrides
try { loadDevManualGridOverrides(); } catch (e) { /* ignore */ }

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

function getDamageResistanceValue() {
  if (visitorSession?.active) return 0;
  if (typeof window === "undefined" || !window.StatsManager) return 0;
  const manager = window.StatsManager;
  if (typeof manager.getStatValue !== "function") return 0;
  const value = manager.getStatValue("damage_resistance") || 0;
  return Math.max(0, Math.min(0.9, value));
}

function getNpcTimerScale() {
  const reduction = getDamageResistanceValue();
  return Math.max(0.1, 1 - reduction);
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
const TITLE_OVERLAY_BODY =
  uiTexts.titleBody ||
  [
    "Wage war against the powers of darkness as they attack your flock with temptation, lies, and despair.",
    "You have one year to save the church... and the town.",
  ].join(" ");

function showTitleDialog() {
  if (!window.DialogOverlay || titleDialogActive) return;
  titleDialogActive = true;
  window.DialogOverlay.show({
    title: "Battle Church",
    body: TITLE_OVERLAY_BODY,
    buttonText: "Continue (Space)",
    variant: "title",
    onContinue: () => {
      titleDialogActive = false;
      startGameFromTitle();
    },
  });
}

function startGameFromTitle() {
  // Ensure title is hidden and game is paused while we enter briefing.
  paused = true;
  needsCountdown = false;
  gameStarted = false;
  if (window.StatsManager) window.StatsManager.resetStats();
  // Clear any previously queued announcements so the congregation doesn't show
  // immediately (init/restart may have queued them at startup).
  try {
    if (Array.isArray(levelAnnouncements)) levelAnnouncements.length = 0;
  } catch (e) {}
  try {
    titleScreenActive = false;
    howToPlayActive = false;
    paused = false;
    if (levelManager && typeof levelManager.startBriefing === "function") {
      levelManager.startBriefing(1);
    } else if (levelManager && typeof levelManager.advanceFromBriefing === "function") {
      levelManager.advanceFromBriefing(1);
    }
    return;
  } catch (e) {}
}

const HOW_TO_PLAY_BODY =
  uiTexts.howToPlayBody ||
  [
    "Move with the joystick/WASD and press A for melee.",
    "Use the space bar or virtual Space button for the Upgrade/Continue screens.",
    "Keep the flock alive and stay within the fog as the horde advances.",
  ].join(" ");

const PAUSE_BODY =
  uiTexts.pauseBody ||
  [
    "Game paused. Take a breather, then press Continue or Space to resume.",
    "Your congregation will hold its place while you choose to keep fighting.",
  ].join(" ");

const GAME_OVER_BODY =
  uiTexts.gameOverBody ||
  "You have no strength to continue the battle.\nThe church and the town are lost to darkness.";


function resumeFromPause() {
  pauseDialogActive = false;
  paused = false;
  gameStarted = true;
  keysJustPressed.clear();
  window.isPauseOverlayActive = false;
  if (window.DialogOverlay && window.DialogOverlay.isVisible()) {
    window.DialogOverlay.hide();
  }
}

function showPauseDialog() {
  if (!window.DialogOverlay || pauseDialogActive) return;
  pauseDialogActive = true;
  window.isPauseOverlayActive = true;
  window.DialogOverlay.show({
    title: "Paused",
    body: PAUSE_BODY,
    buttonText: "Continue (Space)",
    variant: "pause",
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
      onContinue: () => {
      window.gameOverDialogActive = false;
      window.gameOverDialogShown = false;
      restartGame();
    },
  });
}

let pendingUpgradeAfterSummary = false;

function showBattleSummaryDialog(announcement, savedCount, lostCount, upgradeAfter, portraits = {}) {
  if (!window.DialogOverlay || window.DialogOverlay.isVisible()) return false;
  pendingUpgradeAfterSummary = Boolean(upgradeAfter);
  const title = announcement?.title || "Battle Summary";
  const subtitle = announcement?.subtitle || "Battle cleared";
  const body = `${subtitle}\nSaved NPCs: ${savedCount}\nLost NPCs: ${lostCount}`;
  window.DialogOverlay.show({
    title,
    body,
    buttonText: "Continue (Space)",
    variant: "summary",
    portraits,
    onContinue: () => {
      dismissCurrentLevelAnnouncement();
      window.DialogOverlay.consumeAction();
    },
  });
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

function spawnPowerUpDrops(count = 1) {
  const animalEntries = Object.entries(assets?.animals || {});
  const hasAnimals = animalEntries.length > 0;
  const hasUtility = Object.keys(assets?.utility || {}).length > 0;
  if (!hasAnimals && !hasUtility) return;
  for (let i = 0; i < count; i += 1) {
    const spawnUtility = hasUtility && Math.random() < 0.45;
    if (spawnUtility) {
      if (canSpawnUtilityPowerUp()) {
        spawnUtilityPowerUp();
      }
      continue;
    }
    if (!hasAnimals) {
      if (canSpawnUtilityPowerUp()) {
        spawnUtilityPowerUp();
      }
      continue;
    }
    if (!canSpawnWeaponPowerUp()) {
      if (canSpawnUtilityPowerUp()) spawnUtilityPowerUp();
      continue;
    }
    const [type, def] = animalEntries[Math.floor(Math.random() * animalEntries.length)];
    if (isWeaponPowerEffect(def?.effect) && !canSpawnWeaponPowerUp()) {
      if (canSpawnUtilityPowerUp()) spawnUtilityPowerUp();
      continue;
    }
    const animal = new Animal({ ...def, type });
    const padding = 120;
    animal.x = Math.random() * (canvas.width - padding * 2) + padding;
    animal.y = Math.random() * (canvas.height - padding * 2) + padding;
    animals.push(animal);
  }
}

const BOSS_TYPE_POOL = ["eliteOrc", "orcRider", "armoredSkeleton", "knightTemplar", "werebear"];

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
  if (!BOSS_TYPE_POOL.length) return "eliteOrc";
  const offset = Math.floor((levelNumber - 1) / 2);
  const index = (offset + Math.floor(Math.random() * BOSS_TYPE_POOL.length)) % BOSS_TYPE_POOL.length;
  return BOSS_TYPE_POOL[index];
}

function spawnBossForLevel(levelNumber) {
  const fallbackType = "eliteOrc";
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

function disposeAmbientDecor() {
  ambientDecor.forEach(({ effect }) => {
    if (effect && typeof effect === "object") {
      effect.dead = true;
    }
  });
  ambientDecor.forEach((decor) => {
    decor.effect = null;
  });
  ambientDecor.splice(0, ambientDecor.length);
}

function rebuildAmbientDecor() {
  disposeAmbientDecor();
  const frames = assets?.effects?.candle;
  if (!frames || !frames.length) return;

  const firstFrame = frames[0] || null;
  const baseFrameSize = firstFrame ? Math.max(firstFrame.width || 0, firstFrame.height || 0) : 16;
  const effectScale = AMBIENT_CANDLE_EFFECT_SCALE;
  const collisionRadius = Math.max(8 * WORLD_SCALE, (baseFrameSize * effectScale) * 0.5);

  const minX = AMBIENT_DECOR_MARGIN;
  const maxX = Math.max(minX, canvas.width - AMBIENT_DECOR_MARGIN);
  const minY = Math.max(HUD_HEIGHT + AMBIENT_DECOR_MARGIN, AMBIENT_DECOR_MARGIN);
  const maxY = Math.max(minY, canvas.height - AMBIENT_DECOR_MARGIN);
  if (maxX <= minX || maxY <= minY) return;

  const homeBounds = getNpcHomeBounds();
  const isInsideHome = (x, y) =>
    x >= homeBounds.minX &&
    x <= homeBounds.maxX &&
    y >= homeBounds.minY &&
    y <= homeBounds.maxY;

  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const desired = Math.max(0, AMBIENT_CANDLE_COUNT);
  const maxAttempts = desired * 15;
  let attempts = 0;

  const collidesWithObstacle = (x, y, radius) => {
    if (!obstacles.length) return false;
    for (const obstacle of obstacles) {
      const dx = x - obstacle.x;
      const dy = y - obstacle.y;
      const minDistance = radius + obstacle.collisionRadius + AMBIENT_DECOR_COLLISION_PADDING;
      if (Math.hypot(dx, dy) < minDistance) return true;
    }
    return false;
  };

  while (ambientDecor.length < desired && attempts < maxAttempts) {
    attempts += 1;
    const rawX = minX + (spanX > 0 ? Math.random() * spanX : 0);
    const rawY = minY + (spanY > 0 ? Math.random() * spanY : 0);
    if (isInsideHome(rawX, rawY)) continue;
    if (collidesWithObstacle(rawX, rawY, collisionRadius)) continue;
    if (ambientDecor.some((decor) => {
      const dx = rawX - decor.x;
      const dy = rawY - decor.y;
      return Math.hypot(dx, dy) < (collisionRadius + (decor.radius || 0) + AMBIENT_DECOR_COLLISION_PADDING * 0.5);
    })) {
      continue;
    }

    const effect = Effects.spawnLoopingEffect(frames, rawX, rawY, {
      frameDuration: AMBIENT_CANDLE_FRAME_DURATION,
      scale: effectScale,
    });
    if (!effect) continue;

    ambientDecor.push({
      type: "candle",
      xRatio: canvas.width > 0 ? rawX / canvas.width : 0.5,
      yRatio: canvas.height > 0 ? rawY / canvas.height : 0.5,
      x: rawX,
      y: rawY,
      radius: collisionRadius,
      effectScale,
      frameDuration: AMBIENT_CANDLE_FRAME_DURATION,
      frames,
      effect,
    });
  }
}

function positionAmbientDecor() {
  if (!ambientDecor.length) return;
  const fallbackFrames = assets?.effects?.candle || [];
  if (!fallbackFrames.length && ambientDecor.every((decor) => !decor.frames || !decor.frames.length)) {
    disposeAmbientDecor();
    return;
  }

  ambientDecor.forEach((decor) => {
    const frames = (decor.frames && decor.frames.length) ? decor.frames : fallbackFrames;
    if (!frames || !frames.length) return;
    const x = decor.xRatio * canvas.width;
    const y = decor.yRatio * canvas.height;
    decor.x = x;
    decor.y = y;
    const isActive = decor.effect && !decor.effect.dead && effects.includes(decor.effect);
    const effectScale = decor.effectScale ?? AMBIENT_CANDLE_EFFECT_SCALE;
    const frameDuration = decor.frameDuration ?? AMBIENT_CANDLE_FRAME_DURATION;

    if (!isActive) {
      const newEffect = Effects.spawnLoopingEffect(frames, x, y, {
        frameDuration,
        scale: effectScale,
      });
      decor.effect = newEffect || null;
      return;
    }

    decor.effect.x = x;
    decor.effect.y = y;
    if (typeof decor.effect.scale === "number" && decor.effect.scale !== effectScale) {
      decor.effect.scale = effectScale;
    }
  });
}

function spawnWeaponDrops(minCount = 1) {
  if (!canSpawnWeaponPowerUp()) return;
  const entries = Object.entries(assets.animals || {});
  if (!entries.length) return;
  while (animals.length < minCount && canSpawnWeaponPowerUp()) {
    const [type, def] = entries[Math.floor(Math.random() * entries.length)];
    animals.push(new Animal({ ...def, type }));
  }
}

function isWeaponPowerEffect(effect) {
  return WEAPON_POWERUP_EFFECTS.has(effect);
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

  const isInsideHome = (x, y) =>
    x >= homeBounds.minX &&
    x <= homeBounds.maxX &&
    y >= homeBounds.minY &&
    y <= homeBounds.maxY;

  const spanX = Math.max(0, maxX - minX);
  const spanY = Math.max(0, maxY - minY);

  let spawnX;
  let spawnY;

  if (position?.x !== undefined || position?.y !== undefined) {
    spawnX = Math.max(minX, Math.min(maxX, position?.x ?? minX));
    spawnY = Math.max(minY, Math.min(maxY, position?.y ?? minY));
    if (isInsideHome(spawnX, spawnY)) {
      const centerX = (homeBounds.minX + homeBounds.maxX) / 2;
      const centerY = (homeBounds.minY + homeBounds.maxY) / 2;
      if (spawnX >= homeBounds.minX && spawnX <= homeBounds.maxX) {
        spawnY = spawnY < centerY ? homeBounds.minY - 24 : homeBounds.maxY + 24;
      }
      if (spawnY >= homeBounds.minY && spawnY <= homeBounds.maxY) {
        spawnX = spawnX < centerX ? homeBounds.minX - 24 : homeBounds.maxX + 24;
      }
      spawnX = Math.max(minX, Math.min(maxX, spawnX));
      spawnY = Math.max(minY, Math.min(maxY, spawnY));
    }
  } else {
    let attempts = 0;
    do {
      spawnX = minX + (spanX > 0 ? Math.random() * spanX : 0);
      spawnY = minY + (spanY > 0 ? Math.random() * spanY : 0);
      attempts += 1;
    } while (isInsideHome(spawnX, spawnY) && attempts < 50);
    if (isInsideHome(spawnX, spawnY)) {
      const horizontalGap =
        spawnX < homeBounds.minX
          ? homeBounds.minX - spawnX
          : spawnX > homeBounds.maxX
          ? spawnX - homeBounds.maxX
          : 0;
      const verticalGap =
        spawnY < homeBounds.minY
          ? homeBounds.minY - spawnY
          : spawnY > homeBounds.maxY
          ? spawnY - homeBounds.maxY
          : 0;
      if (horizontalGap >= verticalGap) {
        spawnX = spawnX < homeBounds.minX ? homeBounds.minX - 24 : homeBounds.maxX + 24;
      } else {
        spawnY = spawnY < homeBounds.minY ? homeBounds.minY - 24 : homeBounds.maxY + 24;
      }
      spawnX = Math.max(minX, Math.min(maxX, spawnX));
      spawnY = Math.max(minY, Math.min(maxY, spawnY));
    }
  }

  const definition = { ...asset, type: selected };
  const powerUp = new UtilityPowerUp(definition, spawnX, spawnY);
  utilityPowerUps.push(powerUp);
  return powerUp;
}

function spawnWeaponPowerAnimal(position = null) {
  if (!assets?.animals) return null;
  const entries = Object.entries(assets.animals).filter(([, def]) => isWeaponPowerEffect(def?.effect));
  if (!entries.length || !canSpawnWeaponPowerUp()) return null;
  const [type, def] = entries[Math.floor(Math.random() * entries.length)];
  const animal = new Animal({ ...def, type });
  if (position?.x !== undefined) animal.x = position.x;
  if (position?.y !== undefined) animal.y = position.y;
  animals.push(animal);
  return animal;
}

function showWeaponPowerupFloatingText(text, color = "#fff") {
  addFloatingText(text, color, {
    speechBubble: false,
    vy: -32,
    life: 1.4,
    offsetY: -player.radius - 48,
    style: "plain",
  });
}

function applyAnimalEffect(animal) {
  if (!player) return;
  const def = animal.definition;
  switch (animal.effect) {
    case "heal": {
      const healAmount =
        typeof def.healAmount === "number" ? def.healAmount : Math.round(HERO_HEALTH_PER_HEART);
      player.health = Math.min(player.maxHealth, player.health + healAmount);
      addStatusText(player, "Health Up!", {
        color: "#5cff8d",
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
  const { effect, duration = 6, speedMultiplier, extendMultiplier } = powerUp.definition;
  const floatingColor =
    powerUp.definition.statBoostColor ??
    powerUp.definition.color ??
    "#ffffff";
  const initialWeaponTimer = player.weaponPowerTimer;
  let addedExtendSeconds = 0;
  let floatingText = null;
  switch (effect) {
    case "shield":
      player.shieldTimer = Math.max(player.shieldTimer, duration);
      break;
    case "haste":
      player.speedBoostTimer = Math.max(player.speedBoostTimer, duration);
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
      addedExtendSeconds = Math.max(0, player.weaponPowerTimer - initialWeaponTimer);
      break;
    case "harmony":
      npcHarmonyBuffTimer = Math.max(npcHarmonyBuffTimer, duration);
      floatingText = `NPC Harmony +${Math.round(duration)}s`;
      break;
    default:
      break;
  }
  triggerPowerUpCooldown();
  if (effect === "haste") {
    const multiplier = Number.isFinite(speedMultiplier) ? speedMultiplier : 1.4;
    const percent = Math.round((multiplier - 1) * 100);
    if (percent > 0) {
      floatingText = `Speed +${percent}%`;
    }
  } else if (effect === "extend" && addedExtendSeconds > 0.05) {
    floatingText = `Extended Attack +${addedExtendSeconds.toFixed(1)}s`;
  }
  if (floatingText) {
    addFloatingText(floatingText, floatingColor, {
      speechBubble: false,
      vy: -32,
      life: 1.4,
      offsetY: -player.radius - 48,
      style: "plain",
    });
  }
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

function updateAnimals(dt) {
  animals.forEach((animal) => {
    if (!animal) return;
    animal.update(dt);
    if (!animal.active) return;
    resolveEntityCollisions(animal, animals, { allowPush: true, overlapScale: 1 });
    resolveEntityCollisions(animal, enemies, { allowPush: true, overlapScale: 1 });
    resolveEntityCollisions(animal, [player], { allowPush: true, overlapScale: 1 });
    clampEntityToBounds(animal);
  });

  for (let i = animals.length - 1; i >= 0; i -= 1) {
    const animal = animals[i];
    if (!animal) continue;
    if (animal.expired || !animal.active) {
      animals.splice(i, 1);
      triggerPowerUpCooldown();
      continue;
    }
    if (!player) continue;
    const dx = animal.x - player.x;
    const dy = animal.y - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= (animal.radius || 0) + player.radius) {
      applyAnimalEffect(animal);
      animals.splice(i, 1);
    }
  }
}

function spawnKeyPickup(x, y, options = {}) {
  const frames = assets?.items?.keyPickup?.frames;
  if (!frames || !frames.length) return null;
  const pickup = {
    x,
    y,
    radius: options.radius || KEY_PICKUP_RADIUS,
    frames,
    frameIndex: Math.floor(Math.random() * frames.length),
    frameTimer: Math.random() * KEY_PICKUP_FRAME_DURATION,
    frameDuration: KEY_PICKUP_FRAME_DURATION,
    bobTimer: Math.random() * Math.PI * 2,
    value: Math.max(1, Math.round(options.value || 1)),
    life: options.life || KEY_PICKUP_LIFETIME,
    vx: options.vx ?? (options.scatter ? randomInRange(-90, 90) : 0),
    vy: options.vy ?? (options.scatter ? randomInRange(-180, -60) : 0),
    gravity: options.gravity ?? KEY_PICKUP_GRAVITY,
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
    const bob = Math.sin(pickup.bobTimer) * 4;
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
  keyPickups.push(pickup);
  return pickup;
}

function spawnKeyBurst(count = 10, { centerX = canvas.width / 2, centerY = (canvas.height + HUD_HEIGHT) / 2, spread = 220 } = {}) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * spread * 0.8;
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;
    spawnKeyPickup(x, y, { scatter: true });
  }
}

function spawnVictoryKeyBurst(options = {}) {
  const { amount = 20, reason = "battle", centerX: overrideX = null, centerY: overrideY = null } = options || {};
  const area = getPlayfieldBounds();
  const centerX =
    Number.isFinite(overrideX) ? overrideX : player ? player.x : (area.minX + area.maxX) / 2;
  const centerY =
    Number.isFinite(overrideY) ? overrideY : player ? player.y : (area.minY + area.maxY) / 2;
  const spread =
    reason === "boss"
      ? Math.max(area.maxX - area.minX, area.maxY - area.minY) * 0.6
      : Math.min(area.maxX - area.minX, area.maxY - area.minY) * 0.4;
  spawnKeyBurst(amount, { centerX, centerY, spread });
}

function maybeDropKeysFromEnemy(enemy) {
  if (!enemy || visitorSession?.active) return;
  const framesAvailable = assets?.items?.keyPickup?.frames;
  if (!framesAvailable || !framesAvailable.length) return;
  let chance = KEY_DROP_BASE_CHANCE;
  if (enemy.config?.score && enemy.config.score >= 120) {
    chance += KEY_DROP_HIGH_VALUE_BONUS;
  }
  const referenceRadius = enemy.radius || enemy.config?.radius || 24;
  const sizeRatio = Math.max(0, referenceRadius - 24) / 48;
  chance += sizeRatio * KEY_DROP_SIZE_CHANCE_FACTOR;
  const normalizedChance = Math.min(0.95, chance);
  chance = normalizedChance;
  const popcornTypes = new Set(["miniImp", "miniImpLevel2", "miniFireImp", "miniDemon", "miniDemoness"]);
  if (popcornTypes.has(enemy.type)) {
    chance *= KEY_DROP_MINION_SCALE;
  }
  if (Math.random() > chance) return;
  const stacks = 1 +
    Math.floor(Math.random() * KEY_DROP_MAX_STACK) +
    Math.floor(sizeRatio * KEY_DROP_SIZE_STACK_FACTOR * KEY_DROP_MAX_STACK);
  for (let i = 0; i < stacks; i += 1) {
    spawnKeyPickup(enemy.x, enemy.y, { scatter: true });
  }
}

function updateKeyPickups(dt) {
  if (!keyPickups.length) return;
  for (let i = keyPickups.length - 1; i >= 0; i -= 1) {
    const pickup = keyPickups[i];
    if (!pickup) continue;
    pickup.frameTimer += dt;
    pickup.bobTimer += dt * 3;
    if (pickup.spawnBlink > 0) pickup.spawnBlink = Math.max(0, pickup.spawnBlink - dt);
    while (pickup.frameTimer >= pickup.frameDuration) {
      pickup.frameTimer -= pickup.frameDuration;
      pickup.frameIndex = (pickup.frameIndex + 1) % pickup.frames.length;
    }
    pickup.vx *= KEY_PICKUP_AIR_DRAG;
    pickup.vy *= KEY_PICKUP_AIR_DRAG;
    pickup.x += pickup.vx * dt;
    pickup.y += pickup.vy * dt;
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
      if (distance < KEY_PICKUP_ATTRACT_DISTANCE && player.state !== "death") {
        const attract = KEY_PICKUP_ATTRACT_FORCE * (1 - distance / KEY_PICKUP_ATTRACT_DISTANCE);
        pickup.vx += (dx / Math.max(distance, 0.001)) * attract * dt;
        pickup.vy += (dy / Math.max(distance, 0.001)) * attract * dt;
      }
      if (distance <= (player.radius || 24) + pickup.radius) {
        addKeys(pickup.value);
        addFloatingTextAt(player.x, player.y - player.radius - 24, `${pickup.value}`, "#ffe570", {
          life: 0.9,
          vy: -18,
        });
        spawnImpactEffect(player.x, player.y - player.radius / 2);
        keyPickups.splice(i, 1);
        continue;
      }
    }
    if (pickup.life <= 0) {
      keyPickups.splice(i, 1);
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
  const announcement = {
    title,
    subtitle,
    duration,
    timer: duration,
    requiresConfirm,
  };
  levelAnnouncements.push(announcement);
}

function updateLevelAnnouncements(dt) {
  for (let i = levelAnnouncements.length - 1; i >= 0; i -= 1) {
    const announcement = levelAnnouncements[i];
    if (announcement.requiresConfirm) continue;
    announcement.timer -= dt;
    if (announcement.timer <= 0) {
      levelAnnouncements.splice(i, 1);
    }
  }
}

function dismissCurrentLevelAnnouncement() {
  if (!levelAnnouncements.length) return;
  const current = levelAnnouncements[0];
  if (!current.requiresConfirm) {
    levelAnnouncements.shift();
    return;
  }
  levelAnnouncements.shift();
  if (levelManager?.acknowledgeAnnouncement) {
    try { levelManager.acknowledgeAnnouncement(); } catch (e) {}
  }
  if (levelManager?.getStatus) {
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
  if ((enemy.touchCooldown || 0) > 0) return;

  if (player && player.state !== "death") {
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distance = Math.hypot(dx, dy);
    const threshold = enemy.radius + player.radius * 0.65;
    if (distance <= threshold) {
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
      const dx = enemy.x - npc.x;
      const dy = enemy.y - npc.y;
      const distance = Math.hypot(dx, dy);
      const threshold = enemy.radius + (npc.radius || 24);
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
  const targetRadius = target.config?.hitRadius || target.radius || 30;
  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const distance = Math.hypot(dx, dy);
  const shieldReach = player.radius * 1.6 + targetRadius;
  if (distance > shieldReach) return false;

  const isLargeTarget = targetRadius >= SHIELD_LARGE_RADIUS_THRESHOLD;
  if (isLargeTarget) {
    if ((target.shieldHitCooldown || 0) > 0) {
      if (typeof target.touchCooldown === "number") {
        target.touchCooldown = Math.max(target.touchCooldown, SHIELD_LARGE_COOLDOWN);
      }
      return true;
    }
    if (typeof target.takeDamage === "function") {
      target.takeDamage(SHIELD_LARGE_DAMAGE);
    }
    target.shieldHitCooldown = SHIELD_LARGE_COOLDOWN;
  } else {
    if (typeof target.takeDamage === "function") {
      target.takeDamage(SHIELD_SMALL_DAMAGE);
    }
    target.shieldHitCooldown = SHIELD_LARGE_COOLDOWN;
  }
  spawnFlashEffect(target.x, target.y - targetRadius / 2);
  if (typeof target.touchCooldown === "number") {
    target.touchCooldown = Math.max(target.touchCooldown, SHIELD_LARGE_COOLDOWN);
  }
  return true;
}

function detonateWisdomMissleProjectile(projectile) {
  const radius = MAGIC_SPLASH_RADIUS;
  const centerX = projectile.x;
  const centerY = projectile.y;
  const baseDamage = projectile.getDamage() * MAGIC_SPLASH_DAMAGE_MULTIPLIER;
  enemies.forEach((enemy) => {
    if (enemy.dead || enemy.state === "death") return;
    const distance = Math.hypot(enemy.x - centerX, enemy.y - centerY);
    const threshold = radius + (enemy.config?.hitRadius || enemy.radius || 0) * 0.6;
    if (distance <= threshold) {
      enemy.takeDamage(baseDamage);
    }
  });
  if (activeBoss && !activeBoss.dead && !activeBoss.removed) {
    const distance = Math.hypot(activeBoss.x - centerX, activeBoss.y - centerY);
    const threshold = radius + (activeBoss.radius || 0) * 0.6;
    if (distance <= threshold) {
      activeBoss.takeDamage(baseDamage);
    }
  }
  spawnMagicSplashEffect(centerX, centerY, radius);
  // Wisdom impact sparks now use the flash1-14 sheet (same asset path as the projectile loader).
  spawnFlashEffect(centerX, centerY - radius / 2);
  projectile.dead = true;
  applyCameraShake(WISDOM_HIT_SHAKE_DURATION, WISDOM_HIT_SHAKE_MAGNITUDE);
}

function detonateFaithCannonProjectile(projectile, { endOfRange = false } = {}) {
  if (!projectile || projectile.dead) return;
  const radius = FAITH_CANNON_SPLASH_RADIUS;
  const centerX = projectile.x;
  const centerY = projectile.y;
  const splashDamage = projectile.getDamage() * FAITH_CANNON_SPLASH_DAMAGE_MULTIPLIER;
  enemies.forEach((enemy) => {
    if (enemy.dead || enemy.state === "death") return;
    const distance = Math.hypot(enemy.x - centerX, enemy.y - centerY);
    const threshold = radius + (enemy.config?.hitRadius || enemy.radius || 0) * 0.6;
    if (distance <= threshold) {
      enemy.takeDamage(splashDamage);
    }
  });
  // vampire damage handling removed
  
  // vampire damage handling removed
  if (activeBoss && !activeBoss.dead && !activeBoss.removed) {
    const distance = Math.hypot(activeBoss.x - centerX, activeBoss.y - centerY);
    const threshold = radius + (activeBoss.radius || 0) * 0.6;
    if (distance <= threshold) {
      activeBoss.takeDamage(splashDamage);
    }
  }
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
    if (enemy.dead || enemy.state === "death") return;
    candidates.push({ entity: enemy, kind: "enemy" });
  });
  // vampire candidates removed from aim assist
  // NPCs are intentionally excluded from aim-assist candidates to keep
  // player aim under direct control and avoid auto-targeting friendly NPCs.

  const priorityForKind = (kind) => {
    if (kind === "npc") return 0;
    return 1;
  };

  let bestCandidate = null;
  let bestPriority = Infinity;
  let bestDistance = Infinity;
  candidates.forEach(({ entity, kind }) => {
    const vx = entity.x - origin.x;
    const vy = entity.y - origin.y;
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
  const lateralMargin = Math.max(radius, 16);
  const verticalMargin = Math.max(radius, 16);
  const clampedX = Math.max(lateralMargin, Math.min(canvas.width - lateralMargin, entity.x));
  entity.x = clampedX;
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
  entity.y = Math.max(topLimit, Math.min(bottomLimit, entity.y));
}

function resolveEntityObstacles(entity) {
  if (entity?.spawnOffscreenTimer > 0) return;
  if (!entity || entity?.ignoreWorldBounds) return;
  if (entity?.ignoreObstacles) return;
  const hasStaticObstacles = obstacles.length > 0;
  const hasAmbientObstacles = ambientDecor.length > 0;
  if (!hasStaticObstacles && !hasAmbientObstacles) return;
  const maxIterations = 5;
  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let adjusted = false;
    if (hasStaticObstacles) {
      for (const obstacle of obstacles) {
        const dx = entity.x - obstacle.x;
        const dy = entity.y - obstacle.y;
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
    if (hasAmbientObstacles) {
      for (const decor of ambientDecor) {
        const radius = decor.radius || 0;
        if (radius <= 0) continue;
        const dx = entity.x - decor.x;
        const dy = entity.y - decor.y;
        const distance = Math.hypot(dx, dy);
        const minDistance = (entity.radius || 0) + radius;
        if (distance < minDistance && minDistance > 0) {
          const overlap = minDistance - (distance || 0);
          const nx = distance === 0 ? 1 : dx / distance;
          const ny = distance === 0 ? 0 : dy / distance;
          entity.x += nx * overlap;
          entity.y += ny * overlap;
          adjusted = true;
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
  const isEnemyEntity = (ent) =>
    Boolean(ent && !ent.isCozyNpc && !ent.isPlayer && typeof ent.type === "string");
  const hasMiniBehavior = (ent) => {
    if (!ent) return false;
    const behavior = Array.isArray(ent.config?.specialBehavior)
      ? ent.config.specialBehavior
      : [];
    if (behavior.includes("mini")) return true;
    const type = typeof ent.type === "string" ? ent.type.toLowerCase() : "";
    return type.startsWith("mini");
  };
  const getSwarmSpacing = (ent) => {
    const val = ent?.config?.swarmSpacing;
    if (Number.isFinite(val) && val > 0) return Math.max(0.25, Math.min(2, val));
    return 1;
  };
  const isMiniImp = (ent) => {
    const type = typeof ent?.type === "string" ? ent.type : "";
    return type === "miniImp" || type === "miniImpLevel2";
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
    const dx = entity.x - other.x;
    const dy = entity.y - other.y;
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
  // vampire clearing removed
  if (includeBoss && activeBoss && typeof activeBoss.takeDamage === "function") {
    activeBoss.takeDamage(activeBoss.health + (activeBoss.maxHealth || 0) + 9999);
  }
  bossHazards.length = 0;
}

function computeObstacleAvoidance(entity) {
  const hasStaticObstacles = obstacles.length > 0;
  const hasAmbientObstacles = ambientDecor.length > 0;
  if (!hasStaticObstacles && !hasAmbientObstacles) return { x: 0, y: 0 };
  let steerX = 0;
  let steerY = 0;
  const applyObstacle = (ox, oy, radius) => {
    if (!radius || radius <= 0) return;
    const dx = entity.x - ox;
    const dy = entity.y - oy;
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
  if (hasAmbientObstacles) {
    for (const decor of ambientDecor) {
      applyObstacle(decor.x, decor.y, decor.radius || 0);
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
  if (type === "skeleton") return true;
  if (config.projectileType === "arrow") return true;
  return false;
}

class Animal {
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
    const sprite = this.frames && this.frames.length ? this.frames[this.frameIndex] : this.image;
    const width = (sprite ? sprite.width : this.image.width) * this.scale;
    const height = (sprite ? sprite.height : this.image.height) * this.scale;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.drawImage(sprite || this.image, -width / 2, -height / 2, width, height);
    let glowRadius = Math.max(width, height);
    if (this.effect === "cannonWeapon") {
      glowRadius = Math.max(width, height);
    } else if (this.effect === "wisdomWeapon") {
      glowRadius *= 1.25;
    }
    const spawnPulse = (Math.sin(performance.now() * 0.02) + 1) / 2;
    const basePulse = (Math.sin(performance.now() * 0.01) + 1) / 2;
    const alpha = this.spawnBlinkTimer > 0
      ? 0.18 + 0.25 * spawnPulse
      : 0.08 + 0.18 * basePulse;
    const gradient = ctx.createRadialGradient(0, 0, 4, 0, 0, glowRadius * 0.8);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.32)");
    gradient.addColorStop(0.45, "rgba(255, 244, 190, 0.22)");
    gradient.addColorStop(1, "rgba(255, 244, 150, 0)");
    ctx.globalAlpha = alpha;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

class UtilityPowerUp {
  constructor(definition, x, y) {
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
    this.y = this.baseY + Math.sin(this.floatTimer) * 6;
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
    const width = this.image.width * this.scale;
    const height = this.image.height * this.scale;
    context.save();
    context.translate(this.x, this.y);
    context.drawImage(this.image, -width / 2, -height / 2, width, height);
    const glowRadius = Math.max(width, height);
    const spawnPulse = (Math.sin(performance.now() * 0.02) + 1) / 2;
    const basePulse = (Math.sin(performance.now() * 0.01) + 1) / 2;
    const alpha = this.spawnBlinkTimer > 0
      ? 0.18 + 0.25 * spawnPulse
      : 0.08 + 0.18 * basePulse;
    const gradient = context.createRadialGradient(0, 0, 4, 0, 0, glowRadius * 0.8);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.32)");
    gradient.addColorStop(0.45, "rgba(255, 244, 190, 0.22)");
    gradient.addColorStop(1, "rgba(255, 244, 150, 0)");
    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(0, 0, glowRadius, 0, Math.PI * 2);
    context.fill();
    context.restore();

    context.restore();
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
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= this.radius + player.radius * 0.6) {
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
    const { flashWhite = 0 } = options || {};
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
      context.globalAlpha = 0.35;
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
    context.translate(x, y);
    data.layers.forEach((image) => {
      context.drawImage(
        image,
        sx,
        sy,
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
      context.globalAlpha = flashAmount;
      context.filter = `brightness(${(1 + flashAmount * 1.4).toFixed(2)}) saturate(${(1 + flashAmount * 0.9).toFixed(2)})`;
      data.layers.forEach((image) => {
        context.drawImage(
          image,
          sx,
          sy,
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
  animator.draw(context, size / 2, size / 2 + size * 0.1);
  // Tag the canvas with a unique id to aid debugging and de-dup logic.
  try {
    const existingCounter = window.__npcPortraitCounter || 0;
    window.__npcPortraitCounter = existingCounter + 1;
    canvas.__portraitId = `npc_portrait_${window.__npcPortraitCounter}`;
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
    this.miniGhostSuppressTimer = 0;
    this.needsPlayerRestore = false;
    this.animator.setState("walk", { restart: true });
    this.statusBubble = null;
    this.statusBubbleTimer = 0;
    this.statusBubblePersistent = false;
    this.statusBubbleCritical = false;
    this.pendingLossPortrait = null;
    this.lossRecorded = false;
    this.damageFlashTimer = 0;
    this.damageCooldown = 0;
  }

  needsAid() {
    if (!this.active || this.departed) return false;
    return this.faith < this.maxFaith || this.state === "drained";
  }

  isDraining() {
    return Boolean(this.drainSource && !this.drainSource.dead && !this.drainSource.removed);
  }

  startDrain(vampire) {
    if (!this.active || this.state === "lostFaith" || this.state === "departed") return;
    this.state = "drained";
    this.drainSource = vampire;
    this.animator.setState("hurt", { restart: true });
    this.animator.setMoving(false);
    this.idleTimer = 0;
    this.stuckTimer = 0;
    this.updateFaithVisibility(true);
    triggerHeroRescueCall();
  }

  stopDrain(vampire) {
    if (this.drainSource !== vampire) return;
    this.drainSource = null;
    this.updateFaithVisibility(true);
  }

  markMiniGhostAttack() {
    this.miniGhostSuppressTimer = Math.max(this.miniGhostSuppressTimer || 0, 1.6);
  }

  loseFaith() {
    if (this.state === "lostFaith" || this.state === "departed") return;
    this.faith = 0;
    this.needsPlayerRestore = true;
    this.state = "lostFaith";
    this.drainSource = null;
    this.exitTarget = this.exitTarget || this.getExitPoint();
    this.animator.setState("walk", { restart: true });
    this.animator.setMoving(true);
    this.updateFaithVisibility(true);
    this.setStatusBubble("I'm outta here!", { color: "#ffbcbc", persist: true, critical: true });
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
    this.drainSource = null;
    this.returnTarget = this.getReturnPoint();
    this.animator.setState("walk", { restart: true });
    this.animator.setMoving(true);
    this.updateFaithVisibility(this.faith < this.maxFaith);
    const returnLine = randomChoice(NPC_RETURN_LINES) || "I'm heading back.";
    this.setStatusBubble(returnLine, { color: "#d7f5ff", duration: 2.6 });
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
    this.target = this.getRandomWalkPoint();
    this.idleTimer = randomInRange(0.6, 1.2);
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
    const { bypassSuppression = false, allowFromZero = false } = options;
    if (!bypassSuppression && (this.miniGhostSuppressTimer || 0) > 0) return false;
    if (this.needsPlayerRestore && !allowFromZero) return false;
    if (typeof amount !== "number" || amount <= 0) return false;
    const prevFaith = this.faith;
    this.faith = Math.min(this.maxFaith, this.faith + amount);
    if (allowFromZero && this.faith > 0) {
      this.needsPlayerRestore = false;
    }
    if (this.drainSource && this.faith >= NPC_FAITH_RETURN_THRESHOLD) {
      const vampire = this.drainSource;
      if (vampire && typeof vampire.releaseDrain === "function") {
        vampire.releaseDrain();
      }
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
    if (this.state === "drained" && !this.isDraining() && this.faith >= NPC_FAITH_RETURN_THRESHOLD) {
      this.beginReturn({ announce: true });
    }
    if (fullFaith && this.state !== "wander") {
      this.faith = this.maxFaith;
      if (this.state !== "returning") {
        this.beginReturn({ announce: true });
      }
    }
    this.updateFaithVisibility(true);
    return this.faith > prevFaith;
  }

  tryNpcFire(dt) {
    // NPCs can fire arrows once at full faith and respecting cooldowns.
    if (!this.active || this.departed) return false;
    if (this.faith <= 0) return false;
    // countdown
    const timerScale = getNpcTimerScale();
    this.npcArrowCooldown = Math.max(0, (this.npcArrowCooldown || 0) - dt * timerScale);
    if (this.npcArrowCooldown > 0) return false;
    if ((this.miniGhostSuppressTimer || 0) > 0) return false;
    // find nearest valid enemy target
    let best = null;
    let bestDist = Infinity;
    for (const e of enemies) {
      if (!e || e.dead || e.state === 'death') continue;
      const dx = e.x - this.x;
      const dy = e.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d < bestDist && d <= (typeof NPC_ARROW_RANGE_DEFAULT === 'number' ? NPC_ARROW_RANGE_DEFAULT : 520)) {
        bestDist = d;
        best = { e, dx, dy, d };
      }
    }
    if (!best) return false;
    const dir = normalizeVector(best.dx, best.dy);
    const baseCooldown =
      typeof devTools?.npcFireCooldown === "number"
        ? devTools.npcFireCooldown
        : typeof NPC_ARROW_COOLDOWN_DEFAULT === "number"
        ? NPC_ARROW_COOLDOWN_DEFAULT
        : 2.4;
    const statsManager =
      typeof window !== "undefined" ? window.StatsManager : null;
    const emotionalMultiplier =
      typeof statsManager?.getStatMultiplier === "function"
        ? Math.max(1, statsManager.getStatMultiplier("emotional_intelligence") || 1)
        : 1;
    const harmonyMultiplier = npcHarmonyBuffTimer > 0 ? HARMONY_BUFF_MULTIPLIER : 1;
    const totalMultiplier = emotionalMultiplier * harmonyMultiplier;
    const cooldown = Math.max(0.02, baseCooldown / totalMultiplier);
    const damage = Math.round(NPC_ARROW_DAMAGE * totalMultiplier);
    const baseScale = 1.2;
    const scale = baseScale * totalMultiplier;
    // spawn an arrow projectile from NPC toward the enemy
    spawnProjectile("arrow", this.x, this.y, dir.x, dir.y, {
      friendly: true,
      damage,
      source: this,
      scale,
      flipHorizontal: dir.x < 0,
    });
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
    const damageReduction = getDamageResistanceValue();
    const damageScale = Math.max(0.01, 1 - damageReduction);
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
  // Visual debug: floating text showing faith lost
    try {
      showDamage(this, scaledLoss, {
        color: "#ffffff",
        fadeDelay: 0.5,
      });
    } catch (e) {}
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

  setStatusBubble(message, { color = "#f1f5ff", duration = 2.5, persist = false, critical = false } = {}) {
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

  update(dt) {
    if (this.departed) return;
    this.recoveryTextCooldown = Math.max(0, this.recoveryTextCooldown - dt);
    this.miniGhostSuppressTimer = Math.max(
      0,
      (this.miniGhostSuppressTimer || 0) - dt
    );
    const timerScale = getNpcTimerScale();
    this.faithBarTimer = Math.max(0, (this.faithBarTimer || 0) - dt * timerScale);
    this.damageFlashTimer = Math.max(0, this.damageFlashTimer - dt);
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
    if (this.idleTimer > 0) {
      this.idleTimer -= dt;
      this.animator.setMoving(false);
      return;
    }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.hypot(dx, dy);

    if (!distance || distance < 10) {
      this.target = this.getRandomWalkPoint();
      this.idleTimer = randomInRange(0.5, 1.3);
      this.animator.setMoving(false);
      this.updateFaithVisibility(false);
      return;
    }

    const prevX = this.x;
    const prevY = this.y;
    const dirX = dx / distance;
    const dirY = dy / distance;

    this.x += dirX * this.speed * dt;
    this.y += dirY * this.speed * dt;
    this.animator.setDirectionFromVector(dirX, dirY);
    this.animator.setMoving(true);

    resolveEntityObstacles(this);
    clampEntityToBounds(this);

    const travelled = Math.hypot(this.x - prevX, this.y - prevY);
    if (travelled < 0.5) {
      this.stuckTimer += dt;
      if (this.stuckTimer > 1.2) {
        this.target = this.getRandomWalkPoint();
        this.idleTimer = randomInRange(0.4, 1.0);
        this.stuckTimer = 0;
      }
    } else {
      this.stuckTimer = 0;
    }

    this.updateFaithVisibility(false);
  }

  updateDrained(dt) {
    this.animator.setState("hurt");
    this.animator.setMoving(false);
    const draining = this.isDraining();
    if (draining) {
      this.faith = Math.max(0, this.faith - NPC_FAITH_DRAIN_RATE * dt);
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
    const { minX, maxX, minY, maxY } = bounds;
    return {
      x: randomInRange(minX, maxX),
      y: randomInRange(minY, maxY),
    };
  }

  getReturnPoint() {
    const { minX, maxX, minY, maxY } = getNpcHomeBounds();
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    return {
      x: randomInRange(Math.max(minX, centerX - 60), Math.min(maxX, centerX + 60)),
      y: randomInRange(Math.max(minY, centerY - 60), Math.min(maxY, centerY + 60)),
    };
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
    const barY = this.y - this.radius - 22;
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
      });
      return;
    }
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(barX, barY, width, height);
    ctx.strokeStyle = NPC_FAITH_BORDER_COLOR;
    ctx.lineWidth = 1;
    ctx.strokeRect(barX + 0.5, barY + 0.5, width - 1, height - 1);
    ctx.fillStyle = '#9bf0ff';
    ctx.fillRect(barX + 2, barY + 2, (width - 4) * ratio, height - 4);
    if (ratio <= 0) {
      try {
        const t = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const alpha = 0.25 + Math.abs(Math.sin(t * 0.005)) * 0.45;
        ctx.fillStyle = `rgba(255,60,60,${alpha.toFixed(3)})`;
        ctx.fillRect(barX + 2, barY + 2, width - 4, height - 4);
      } catch (e) {}
    }
    if (ratio >= 0.999) {
      try {
        const t = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const raw = 0.6 + Math.abs(Math.sin(t * 0.008)) * 0.4;
        const alpha = Math.max(0.6, Math.min(1, raw));
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255,230,80,${alpha.toFixed(3)})`;
        ctx.fillRect(barX + 2, barY + 2, width - 4, height - 4);
        try {
          ctx.strokeStyle = `rgba(255,230,120,${(Math.min(1, alpha * 0.95)).toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.strokeRect(barX + 2.5, barY + 2.5, width - 5, height - 5);
        } catch (e) {}
        ctx.restore();
      } catch (e) {}
    }
    ctx.restore();
  }

  draw() {
      if (this.departed) return;
      const flashStrength = this.damageFlashTimer > 0
        ? Math.min(1, Math.pow(this.damageFlashTimer / DAMAGE_FLASH_DURATION, 0.6))
        : 0;
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

// Vampire class removed

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
    this.dead = false;
    this.damage = config.damage ?? 0;
    this.scale = config.scale || 1;
    this.flipHorizontal = Boolean(config.flipHorizontal);
    this.loopFrames = Boolean(config.loopFrames);
    this.onImpact = config.onImpact || null;
    this.onExpire = config.onExpire || null;
    this.onImpactTriggered = false;
    this.onExpireTriggered = false;
    this.friendly = config.friendly ?? true;
    this.source = config.source || null;
    this.hitEntities = new Set();
    this.homingTarget = config.homingTarget || null;
    this.homingDuration = Math.max(0, config.homingDuration || 0);
    this.homingStrength = Math.max(0, config.homingStrength ?? 0);
    this.isDivineShot = Boolean(config.isDivineShot);
    if (config.frames && config.frames.length) {
      this.frames = config.frames;
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

    const outLeft = this.x < -this.radius;
    const outRight = this.x > canvas.width + this.radius;
    const outTop = this.y < -this.radius;
    const outBottom = this.y > canvas.height + this.radius;
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
    const dx = enemy.x - this.x;
    const dy = enemy.y - this.y;
    const distance = Math.hypot(dx, dy);
    const threshold = this.radius + (enemy.radius || enemy.config?.hitRadius || 0) * 0.6;
    return distance <= threshold;
  }

  getDamage() {
    return this.damage;
  }

  draw() {
    const shouldGlow = this.friendly;
    if (this.frames) {
      const frame = this.frames[this.frameIndex];
      if (!frame) return;
      const width = frame.width * this.scale;
      const height = frame.height * this.scale;
      ctx.save();
      ctx.translate(this.x, this.y);
      if (this.flipHorizontal) {
        ctx.rotate(this.rotation + Math.PI);
        ctx.scale(-1, 1);
      } else {
        ctx.rotate(this.rotation);
      }
      if (shouldGlow) {
        let glowOptions = undefined;
        let suppressGlow = false;
      if (this.type === "faith_cannon") {
          glowOptions = { radiusScale: 0.2, baseAlpha: 0.12 };
        } else if (this.type === "heart") {
          suppressGlow = true;
        }
        if (!suppressGlow) drawProjectileGlow(width, height, glowOptions);
      }
      ctx.drawImage(frame, -width / 2, -height / 2, width, height);
      ctx.restore();
    } else if (this.animator) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      if (shouldGlow) {
        let glowOptions = undefined;
        let suppressGlow = false;
        if (this.type === "faith_cannon") {
          glowOptions = { radiusScale: 0.2, baseAlpha: 0.12 };
        } else if (this.type === "heart") {
          suppressGlow = true;
        }
        if (!suppressGlow) {
          const size = (this.radius || 18) * 2.2;
          drawProjectileGlow(size, size, glowOptions);
        }
      }
      ctx.restore();
      this.animator.draw(ctx, this.x, this.y, { rotation: this.rotation, scale: this.scale });
    }
  }
}

function drawProjectileGlow(width, height, { radiusScale = 0.7, baseAlpha = 0.2, colorCenter, colorMid, colorEdge } = {}) {
  const pulse = (Math.sin(performance.now() * 0.025) + 1) / 2;
  const alpha = baseAlpha + 0.25 * pulse;
  const radius = Math.max(width, height) * radiusScale;
  const gradient = ctx.createRadialGradient(0, 0, 2, 0, 0, radius);
  gradient.addColorStop(0, colorCenter || "rgba(255, 255, 255, 0.35)");
  gradient.addColorStop(0.5, colorMid || "rgba(170, 235, 255, 0.3)");
  gradient.addColorStop(1, colorEdge || "rgba(140, 210, 255, 0)");
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
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
    this.scaleMultiplier = 2.3 + Math.random() * 0.7; // roughly 2.3x to 3.0x
    this.scale = this.config.scale * this.scaleMultiplier;
    const maxRadius = 420 * WORLD_SCALE;
    this.radius = Math.min(maxRadius, (this.config.hitRadius || 28) * this.scaleMultiplier);
    this.animator = new Animator(this.clips, this.scale);
    this.animator.play("idle");
    this.state = "idle";
    this.facing = "down";
    const bossHealthValue = this.config.maxHealth || this.config.health || 300;
    this.maxHealth = bossHealthValue * 10;
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
    this.safeTopMargin = Math.max(this.radius * 0.8, 160);
    const spawnX = Math.max(this.radius + 20, canvas.width - this.radius - 36);
    const playfieldCenterY = HUD_HEIGHT + (canvas.height - HUD_HEIGHT) / 2;
    const spawnY = Math.max(
      HUD_HEIGHT + this.safeTopMargin,
      Math.min(canvas.height - this.safeTopMargin, playfieldCenterY),
    );
    this.x = spawnX;
    this.y = spawnY;
    clampEntityToBounds(this);
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
      this.state = "walk";
      this.animator.play("walk");
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
    const speedMultiplier = this.phase === 1 ? 0.85 : this.phase === 2 ? 1.05 : 1.2;
    const projectile = spawnProjectile(type, this.x, this.y, dir.x, dir.y, {
      friendly: false,
      speed: (base.speed || 420) * speedMultiplier,
      damage: this.getProjectileDamage(),
      radius: base.radius || 28,
      source: this,
    });
    if (projectile) {
      this.state = "attack";
      this.animator.play("attack", { restart: true });
    }
  }

  summonMinions() {
    const minionPool = ["skeleton", "orc", "swordsman", "wizard"];
    const count = Math.min(3, 2 + Math.floor(this.level / 2));
    if (enemies.length >= MAX_ACTIVE_ENEMIES + 2) return;
    for (let i = 0; i < count; i += 1) {
      const offset = randomInRange(60, 140);
      const angle = Math.random() * Math.PI * 2;
      spawnEnemyOfType(randomChoice(minionPool), {
        x: this.x + Math.cos(angle) * offset,
        y: this.y + Math.sin(angle) * offset,
      });
    }
    addFloatingTextAt(this.x, this.y - this.radius - 30, "Arise!", "#ffcb71", {
      speechBubble: true,
      vy: 0,
      life: 1.8,
      entity: this,
      offsetY: -this.radius - 30,
      bubbleTheme: "evil",
    });
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
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.hypot(dx, dy);
    if (distance > this.radius + player.radius * 0.7) return;
    if (this.touchCooldown > 0) return;
    if (player.invulnerableTimer > 0) {
      this.touchCooldown = Math.max(this.touchCooldown, 0.35);
      return;
    }
    if (player.shieldTimer > 0) {
      applyShieldImpact(this);
      this.touchCooldown = Math.max(this.touchCooldown, SHIELD_LARGE_COOLDOWN);
      this.playTaunt();
      return;
    }
    const damage = this.phase === 3 ? 3 : 2;
    player.takeDamage(damage);
    this.touchCooldown = 2.2 - this.phase * 0.3;
    cameraShakeTimer = CAMERA_SHAKE_DURATION;
    cameraShakeMagnitude = CAMERA_SHAKE_INTENSITY * 1.2;
    this.playTaunt();
  }

  checkPhaseTransition() {
    const ratio = this.maxHealth > 0 ? this.health / this.maxHealth : 0;
    if (ratio <= 0.33 && !this.phaseNotified[3]) {
      this.phase = 3;
      this.phaseNotified[3] = true;
      queueLevelAnnouncement("Phase 3", "The tyrant is enraged!", 2.2);
      this.hazardTimer = 2.5;
      this.summonTimer = 4.5;
      setDevStatus("Boss phase 3 – enraged", 3.5);
    } else if (ratio <= 0.66 && !this.phaseNotified[2]) {
      this.phase = Math.max(this.phase, 2);
      this.phaseNotified[2] = true;
      queueLevelAnnouncement("Phase 2", "Reinforcements arrive!", 2.2);
      this.summonTimer = 2;
      setDevStatus("Boss phase 2 – reinforcements", 3.5);
    }
  }

  takeDamage(amount) {
    if (this.invalid || this.removed || this.state === "death") return;
    this.health = Math.max(0, this.health - amount);
    spawnImpactEffect(this.x, this.y - this.radius / 2);
    showDamage(this, amount, { color: "#ff9191" });
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

  playTaunt() {
    if (this.tauntCooldown > 0) return;
    vampireTaunt(this);
    this.tauntCooldown = 3.2;
  }

  beginDeath() {
  if (this.state === "death") return;
  this.state = "death";
  // Ensure boss death animation plays once and does not loop
  this.animator.play("death", { restart: true, loop: false });
    this.dying = true;
    lastEnemyDeathPosition = { x: this.x, y: this.y };
    if (!this.deathNotified) {
      levelManager?.notifyEnemyDefeated();
      score += 800 + this.level * 400;
      spawnPowerUpDrops(4 + Math.min(3, this.level));
      spawnMagicSplashEffect(this.x, this.y, this.radius * 2.8);
      spawnImpactDustEffect(this.x, this.y, this.radius * 1.2);
      this.deathNotified = true;
    }
    spawnVictoryKeyBurst({ reason: "boss", amount: 70, centerX: this.x, centerY: this.y });
    this.deathExplosionTimer = 5;
    this.deathPostDelay = 3;
    this.deathExplosionAccumulator = 0;
    eliminateActiveEnemiesForBossVictory();
  // compute fallback death timer from clip (prefer explicit frameMap length)
  try {
    const clip = this.animator.currentClip || {};
    const framesFromMap = Array.isArray(clip.frameMap) && clip.frameMap.length ? clip.frameMap.length : null;
    const frames = framesFromMap || (clip.frameCount || 0) || 10;
    const rate = clip && clip.frameRate ? clip.frameRate : 8;
    const expected = Math.max(0.05, frames / Math.max(0.0001, rate));
    this.deathTimer = expected + 0.3;
    console.debug && console.debug('Boss death initiated', { frames, rate, expected, deathTimer: this.deathTimer });
  } catch (e) {}
  }

  spawnDeathExplosionBurst() {
    const burstCount = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < burstCount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * this.radius * 0.9;
      const burstX = this.x + Math.cos(angle) * distance;
      const burstY = this.y + Math.sin(angle) * distance;
      spawnMagicImpactEffect(burstX, burstY);
      if (Math.random() < 0.45) {
        spawnImpactDustEffect(burstX, burstY, this.radius * 0.4);
      }
      if (Math.random() < 0.25) {
        spawnRayboltEffect(burstX, burstY, this.radius * 0.55);
      }
    }
  }

  updateDeathVisuals(dt) {
    if (this.deathExplosionTimer > 0) {
      this.deathExplosionTimer = Math.max(0, this.deathExplosionTimer - dt);
      this.deathExplosionAccumulator += dt;
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

  update(dt) {
    if (!this.isActive()) return;

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
    this.animator.draw(context, this.x, this.y, { flipX: flip });
    this.drawHealthBar(context);
  }

  drawHealthBar(context) {
    const ratio = this.maxHealth > 0 ? Math.max(0, this.health / this.maxHealth) : 0;
    const width = 260;
    const height = 16;
    context.save();
    context.fillStyle = "rgba(0,0,0,0.6)";
    context.fillRect(this.x - width / 2, this.y - this.radius - 40, width, height);
    context.fillStyle = "#ff5757";
    context.fillRect(
      this.x - width / 2 + 3,
      this.y - this.radius - 40 + 3,
      (width - 6) * ratio,
      height - 6,
    );
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
  if (config.friendly === false && window.StatsManager) {
    const manager = window.StatsManager;
    const multiplier = manager.getStatMultiplier
      ? manager.getStatMultiplier("emotional_intelligence") || 1
      : 1;
    const baseDamage = config.damage ?? baseConfig?.damage ?? 1;
    config.damage = Math.max(1, Math.round(baseDamage * multiplier));
  }
  let inspectorFrames = null;
  if (!Array.isArray(overrides.frames)) {
    const overrideFrames = devInspectorOverrides?.[type]?.walk?.frames;
    if (Array.isArray(overrideFrames) && overrideFrames.length && clip) {
      try {
        const clipFrames = getFramesForClip(clip);
        inspectorFrames = overrideFrames.map((idx) => clipFrames[idx]).filter(Boolean);
      } catch (e) {
        inspectorFrames = null;
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
  } else if (inspectorFrames && inspectorFrames.length) {
    config.frames = inspectorFrames;
    config.frameDuration = config.frameDuration ?? (clip.frameRate ? 1 / clip.frameRate : PROJECTILE_FRAME_DURATIONS[type] ?? 0.05);
    config.flipHorizontal = overrides.flipHorizontal ?? dx < 0;
    config.loopFrames = true;
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
  const edge = Math.floor(Math.random() * 3);
  if (edge === 0) {
    // left wall
    return {
      x: -horizontalMargin,
      y: randomInRange(bottomCutoff, height - verticalMargin),
    };
  }
  if (edge === 1) {
    // right wall
    return {
      x: width + horizontalMargin,
      y: randomInRange(bottomCutoff, height - verticalMargin),
    };
  }
  return {
    x: randomInRange(horizontalMargin, width - horizontalMargin),
    y: height + verticalMargin,
  };
}

function createRandomNpcLayers() {
  if (!assets?.npcs) return null;
  const { walk, hurt, eyes, shadow } = assets.npcs;
  if (!walk?.base || !hurt?.base) return null;

  const hairKeys = Object.keys(walk.hair || {});
  const clothesKeys = Object.keys(walk.clothes || {});
  const accessoryKeys = Object.keys(walk.accessories || {});

  const selectedHair = randomChoice(hairKeys);
  const selectedClothing = randomChoice(clothesKeys);
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

function createCozyNpc() {
  const appearance = createRandomNpcLayers();
  if (!appearance) return null;
  // Assign a name from the global NPC name list
  if (!window.npcNameIndex) window.npcNameIndex = 0;
  if (!window.npcNamesList) {
    window.npcNamesList = [
      "Aaron", "Abby", "Adam", "Alex", "Ben", "Blake", "Brock", "Brad", "Carl", "Chris", "Clara", "Cody", "Dave", "Derek", "Diana", "Drew", "Emma", "Emily", "Ethan", "Erin", "Frank", "Felix", "Fiona", "Fred", "Gabe", "Gary", "Gavin", "Greg", "Hank", "Helen", "Henry", "Holly", "Isaac", "Irene", "Ivan", "Janet", "Jesse", "Jill", "Jonah", "Karen", "Katie", "Kelly", "Kevin", "Lance", "Laura", "Linda", "Logan", "Mason", "Megan", "Miles", "Micah", "Naomi", "Nancy", "Nolan", "Oscar", "Owen", "Olive", "Paige", "Peter", "Perry", "Quinn", "Riley", "Robin", "Roger", "Rose", "Sarah", "Simon", "Scott", "Steve", "Terry", "Tony", "Trent", "Todd", "Ulis", "Vince", "Vicky", "Vera", "Wade", "Wendy", "Wayne", "Xena", "Yael", "Yuri", "Zack", "Zane", "Zelda"
    ];
  }
  const name = window.npcNamesList[window.npcNameIndex % window.npcNamesList.length];
  window.npcNameIndex++;
  const npc = new CozyNpc({ appearance });
  npc.name = name;
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
}

function resetCongregationSize() {
  congregationSize = INITIAL_CONGREGATION_SIZE;
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
  const congregationCount = Math.max(1, getCongregationSize());
  const targetVisitors = Math.max(1, Math.min(10, congregationCount));
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
  visitorSession.summaryReason = null;
  visitorSession.awaitingSummaryConfirm = false;
  visitorSession.newMemberPortraits = [];
  visitorSession.newMemberNames = [];
  visitorSession.introActive = true;
  enemies.splice(0, enemies.length);
  projectiles.splice(0, projectiles.length);
  bossHazards.splice(0, bossHazards.length);
  clearAllPowerUps();
  clearKeyPickups();
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
    player.overrideWeaponMode = "heart";
    player.arrowCooldown = 0;
  }
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
  clearAllPowerUps();
  clearKeyPickups();
  if (player && player.overrideWeaponMode === "heart") {
    player.overrideWeaponMode = null;
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
  const baseCount = Math.max(1, getCongregationSize());
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
  const desired = 2;
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
  const map = visitorSession.chattyLines;
  if (map.has(blocker.id)) {
    blocker.chattyLine = map.get(blocker.id);
    return blocker.chattyLine;
  }
  const used = new Set(map.values());
  const candidates = VISITOR_BLOCKER_LINES.filter((line) => !used.has(line));
  const line =
    randomChoice(candidates.length ? candidates : VISITOR_BLOCKER_LINES) ||
    VISITOR_BLOCKER_LINES[0];
  map.set(blocker.id, line);
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
  const appearance = createRandomNpcLayers();
  if (!appearance) return null;
  const animator = new CozyNpcAnimator({
    animations: appearance.animations,
    shadow: appearance.shadow ?? null,
  });
  animator.setState("walk", { restart: true });
  animator.setMoving(true);
  const spawnPoint = congregationStyleGridPosition(index, total);
  // Assign a name from the global NPC name list
  if (!window.npcNameIndex) window.npcNameIndex = 0;
  if (!window.npcNamesList) {
    window.npcNamesList = [
      // fallback names if not set elsewhere
      "Aaron", "Abby", "Adam", "Alan", "Alex", "Alice", "Allen", "Amber", "Andre", "April", "Ariel", "Ashley", "Avery", "Ben", "Benny", "Beth", "Blake", "Brady", "Brian", "Brock", "Caleb", "Carla", "Carol", "Casey", "Cathy", "Chris", "Cindy", "Clara", "Cliff", "Cody", "Colin", "Craig", "Daisy", "David", "Derek", "Diana", "Diane", "Donna", "Dylan", "Edith", "Elise", "Ellen", "Emily", "Emma", "Erick", "Ethan", "Felix", "Fiona", "Frank", "Fred", "Gabe", "Gavin", "Glenn", "Grace", "Grant", "Greg", "Henry", "Irene", "Isaac", "Jackie", "James", "Janet", "Jason", "Jenna", "Jesse", "Jill", "Jimmy", "Jonah", "Jonas", "Julie", "Julia", "Karen", "Katie", "Kelly", "Kevin", "Kyle", "Lance", "Laura", "Linda", "Logan", "Lucas", "Lucy", "Maddie", "Maria", "Mason", "Megan", "Micah", "Miles", "Naomi", "Nancy", "Oscar", "Owen", "Peter", "Quinn", "Riley", "Robin", "Sarah", "Simon", "Terry", "Tony"
    ];
  }
  const name = window.npcNamesList[window.npcNameIndex % window.npcNamesList.length];
  window.npcNameIndex++;
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
  };
  assignHomeWanderTarget(guest, bounds, guest.wanderRadius);
  guest.portrait = captureVisitorPortrait(guest);
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
        const speed = blocker.speed * 2.0;
        blocker.x += (dx / dist) * speed * dt;
        blocker.y += (dy / dist) * speed * dt;
        blocker.animator.setDirectionFromVector(dx, dy);
        blocker.animator.setMoving(true);
        const contactDistance = player.radius + blocker.radius + 6;
        if (dist < contactDistance) {
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
        addFloatingTextAt(blocker.x, blocker.y - blocker.radius - 18, "Thanks, pastor!", "#d7f5ff", {
          life: 0.9,
          vy: 0,
          speechBubble: true,
          bubbleTheme: "npc",
        });
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
    blocker.x += nx * blocker.speed * 0.8 * dt;
    blocker.y += ny * blocker.speed * 0.8 * dt;
    blocker.animator.setDirectionFromVector(nx, ny);
    blocker.animator.setMoving(true);
  }
}

function alignBlockerAtPlayer(blocker) {
  if (!player) return;
  const dx = player.x - blocker.x;
  const dy = player.y - blocker.y;
  const dist = Math.hypot(dx, dy) || 1;
  const contactDistance = player.radius + blocker.radius + 4;
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
    if (projectile.type !== "heart" || projectile.dead) return;
    for (const entity of checkList) {
      if (!entity || entity.removed) continue;
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
        projectile.dead = true;
        applyHeartToEntity(entity, { flash: true });
        break;
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
  blocker.speechBubble = addFloatingTextAt(blocker.x, blocker.y - blocker.radius - 24, line, "#ffe6b5", {
    speechBubble: true,
    bubbleTheme: "npc",
    entity: blocker,
    offsetY: -blocker.radius - 24,
    life: 999,
    persist: true,
  });
}

function markVisitorGuestSaved(guest) {
  if (!guest || guest.saved) return;
  guest.saved = true;
  if (visitorSession) {
    visitorSession.savedVisitors = (visitorSession.savedVisitors || 0) + 1;
    visitorSession.newMemberPortraits = visitorSession.newMemberPortraits || [];
    visitorSession.newMemberNames = visitorSession.newMemberNames || [];
    if (guest.portrait) {
      visitorSession.newMemberPortraits.push(guest.portrait);
      visitorSession.newMemberNames.push(guest.name || "");
    }
  }
  adjustCongregationSize(1);
  spawnRayboltEffect(guest.x, guest.y - guest.radius / 2, (guest.radius || 28) * 1.5);
  addFloatingTextAt(guest.x, guest.y - guest.radius - 32, "I love it here!", "#ffe37a", {
    life: 1.3,
    vy: 0,
    speechBubble: true,
    bubbleTheme: "npc",
  });
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
    addFloatingTextAt(entity.x, entity.y - entity.radius - 18, "Welcome +1", "#ff9ed9", {
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
            entity.animator.flash({ color: "#8bd7ff", duration: 0.35, intensity: 1.6 });
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
      addFloatingTextAt(entity.x, entity.y - entity.radius - 18, "Thanks, pastor!", "#d7f5ff", {
        life: 0.9,
        vy: 0,
        speechBubble: true,
        bubbleTheme: "npc",
      });
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
    addFloatingTextAt(guest.x, guest.y - guest.radius - 24, `Prayer Boost +${percent}%`, "#ffe9ff", {
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
  if (!assets?.npcs) return;
  const total = Math.max(0, count);
  if (total === 0) return;
  const spec = getCongregationSpawnAreaSpecs(total);
  const { bounds, columns, rows, cellWidth, cellHeight } = spec;

  congregationWanderBounds = bounds;

  // Name assignment setup
  if (!window.npcNamesList) {
    window.npcNamesList = [
      "Aaron", "Abby", "Adam", "Alan", "Alex", "Alice", "Allen", "Amber", "Andre", "April", "Ariel", "Ashley", "Avery", "Ben", "Benny", "Beth", "Blake", "Brady", "Brian", "Brock", "Caleb", "Carla", "Carol", "Casey", "Cathy", "Chris", "Cindy", "Clara", "Cliff", "Cody", "Colin", "Craig", "Daisy", "David", "Derek", "Diana", "Diane", "Donna", "Dylan", "Edith", "Elise", "Ellen", "Emily", "Emma", "Erick", "Ethan", "Felix", "Fiona", "Frank", "Fred", "Gabe", "Gavin", "Glenn", "Grace", "Grant", "Greg", "Henry", "Irene", "Isaac", "Jackie", "James", "Janet", "Jason", "Jenna", "Jesse", "Jill", "Jimmy", "Jonah", "Jonas", "Julie", "Julia", "Karen", "Katie", "Kelly", "Kevin", "Kyle", "Lance", "Laura", "Linda", "Logan", "Lucas", "Lucy", "Maddie", "Maria", "Mason", "Megan", "Micah", "Miles", "Naomi", "Nancy", "Oscar", "Owen", "Peter", "Quinn", "Riley", "Robin", "Sarah", "Simon", "Terry", "Tony"
    ];
    window.npcNameIndex = 0;
  }
  for (let i = 0; i < total; i += 1) {
    const appearance = createRandomNpcLayers();
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
    // Assign name from list, fallback to Noname X
    let name = window.npcNamesList[window.npcNameIndex] || `Noname ${i + 1}`;
    window.npcNameIndex++;
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
    };
    assignCongregationTarget(member, { immediate: true });
    congregationMembers.push(member);
  }
}

function clearCongregationMembers() {
  congregationMembers.splice(0, congregationMembers.length);
  congregationWanderBounds = null;
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

function updateCozyNpcs(dt) {
  if (npcsSuspended) return;
  function applyEnemyCollisionDamageToNpc(npcEntity) {
    if (!npcEntity || npcEntity.departed || !npcEntity.active) return;
    if ((npcEntity.damageCooldown || 0) > 0) return;
    if (npcEntity.faith <= 0) return;
    let damageApplied = false;
    for (const enemy of enemies) {
      if (!enemy || enemy.dead || enemy.state === "death") continue;
      if (enemy.type === "miniGhost" || enemy.type === "ghost") continue;
      const dx = enemy.x - npcEntity.x;
      const dy = enemy.y - npcEntity.y;
      const distance = Math.hypot(dx, dy);
      const overlapRadius = (enemy.radius || 0) + (npcEntity.radius || 0);
      if (distance > overlapRadius) continue;
      const enemyDamage = enemy.config?.damage ?? enemy.config?.attackDamage ?? 0;
      if (!enemyDamage) continue;
      const scaled = Math.max(1, Math.round(enemyDamage * 0.75));
      npcEntity.sufferAttack(scaled, { sourceType: enemy.type });
      damageApplied = true;
      break;
    }
    return damageApplied;
  }

  for (let i = npcs.length - 1; i >= 0; i -= 1) {
    const npc = npcs[i];
    const timerScale = getNpcTimerScale();
    npc.damageCooldown = Math.max(0, (npc.damageCooldown || 0) - dt * timerScale);
    npc.update(dt);

    // Player-touch restores NPCs to full faith
    try {
      if (
        player &&
        npc &&
        !npc.departed &&
        npc.active
      ) {
        const dx = npc.x - player.x;
        const dy = npc.y - player.y;
        const distance = Math.hypot(dx, dy);
        const touchRadius = (npc.radius || 20) + (player.radius || 24) * 0.7;
        if (distance <= touchRadius) {
          // Restore NPC faith up to 50% of their max when touched by the player.
          const maxFaith = npc.maxFaith || 1;
          let restoredFaith = false;
          if (npc.faith <= 0) {
            restoredFaith = npc.receiveFaith(maxFaith, {
              allowFromZero: true,
              bypassSuppression: true,
            });
          } else {
            const targetHalf = Math.floor(maxFaith * 0.5);
            const missingToHalf = Math.max(0, targetHalf - (npc.faith || 0));
            if (missingToHalf > 0) {
              restoredFaith = npc.receiveFaith(missingToHalf, {
                allowFromZero: true,
                bypassSuppression: true,
              });
            }
          }
          if (restoredFaith) {
            spawnFlashEffect(npc.x, npc.y - npc.radius / 2);
          }
        }
      }
    } catch (err) {
      console.warn && console.warn('npc touch restore failed', err);
    }

    // Collision handling: let NPCs interact with other entities and obstacles.
    try {
      const leaving = npc.state === "lostFaith";
      if (!leaving) {
        // NPCs should collide with the player (can be pushed), enemies (allow push),
        // other animals, and utility power-ups so they can't pass through pickups.
        if (player && !npc.departed && npc.active) {
          resolveEntityCollisions(npc, [player], { allowPush: true, overlapScale: 0.85 });
        }
        resolveEntityCollisions(npc, enemies, { allowPush: true, overlapScale: 0.85 });
        resolveEntityCollisions(npc, animals, { allowPush: true, overlapScale: 0.9 });
        resolveEntityCollisions(npc, utilityPowerUps, { allowPush: false, overlapScale: 0.9 });
        // Respect world obstacles (trees, walls, etc.) so NPCs don't walk through them.
        resolveEntityObstacles(npc);
        clampEntityToBounds(npc);
        applyEnemyCollisionDamageToNpc(npc);
      }
    } catch (err) {
      console.warn && console.warn('NPC collision resolution failed', err);
    }

    // allow NPCs at full faith to attempt firing at enemies
    try {
      npc.tryNpcFire(dt);
    } catch (e) {}

    if (npc.departed) {
      npcs.splice(i, 1);
    }
  }
}

// spawnVampire and updateVampires removed

function handleDeveloperHotkeys() {
  if (typeof window !== "undefined" && window.__BC_ENEMY_EDITOR_ACTIVE) {
    keysJustPressed.clear();
    return;
  }
  if (!keysJustPressed.size) return;
  if (keysJustPressed.has("1")) {
    devTools.godMode = !devTools.godMode;
    setDevStatus(devTools.godMode ? "God mode enabled" : "God mode disabled", 2.5);
  }
  if (keysJustPressed.has("2")) {
    devClearOpponents({ includeBoss: true });
    setDevStatus("All hostiles eliminated", 2.0);
  }
  if (keysJustPressed.has("3")) {
    if (levelManager?.devSkipHorde?.()) {
      setDevStatus("Battle skipped", 2.0);
    }
  }
  if (keysJustPressed.has("5")) {
    if (levelManager?.devSkipToBoss?.()) {
      setDevStatus("Boss battle engaged", 2.3);
    }
  }
  if (keysJustPressed.has("h")) {
    const harp = spawnUtilityPowerUp("harmony");
    setDevStatus(harp ? "Harmony harp spawned" : "No harp spawn", 1.6);
  }
  if (keysJustPressed.has("o")) {
    enemyDevLabelsVisible = !enemyDevLabelsVisible;
    if (typeof window?.setEnemyDevLabelsVisible === "function") {
      window.setEnemyDevLabelsVisible(enemyDevLabelsVisible);
    }
    setDevStatus(
      `Enemy labels ${enemyDevLabelsVisible ? "ON" : "OFF"}`,
      1.4,
    );
  }
  if (keysJustPressed.has("b")) {
    if (player && typeof player.addPrayerCharge === "function") {
      player.addPrayerCharge(player.prayerChargeRequired || PRAYER_BOMB_CHARGE_REQUIRED || 60);
      setDevStatus("Prayer bomb energized", 2.0);
    }
  }
  if (keysJustPressed.has("F4")) {
    if (levelManager?.devSkipBattle?.()) {
      setDevStatus("Battle sequence skipped", 2.5);
    }
  }
  if (keysJustPressed.has("m")) {
    // Spawn a random MiniFolk for testing
    const miniKeys = MINIFOLKS.map((m) => m.key).filter((k) => assets.enemies?.[k]);
    if (miniKeys.length) {
      const key = miniKeys[Math.floor(Math.random() * miniKeys.length)];
      spawnEnemyOfType(key, randomSpawnPosition());
      setDevStatus(`Spawned ${key}`, 1.8);
    } else {
      setDevStatus("No MiniFolks loaded", 1.8);
    }
  }
  if (keysJustPressed.has("f")) {
    devInspectorActive = !devInspectorActive;
    devInspectorTimer = 0;
    const inspectorTargets = getDevInspectorTargets();
    if (devInspectorActive) {
      if (!inspectorTargets.length) {
        devInspectorActive = false;
        setDevStatus('Dev inspector unavailable (no sheets loaded)', 1.8);
        return;
      }
      devInspectorIndex = devInspectorIndex % inspectorTargets.length;
      const target = inspectorTargets[devInspectorIndex];
      devInspectorFlowActive = true;
      devInspectorCurrentStateIndex = 0;
      const states = ensureInspectorState(target);
      devInspectorSelectedState = states[0] || null;
      setDevStatus(`Dev inspector: ON — pick frames for ${target.label}`, 2.8);
    } else {
      devInspectorFlowActive = false;
      setDevStatus("Dev inspector: OFF", 1.6);
    }
  }
  // Prev / Next fallback hotkeys for inspector key cycling
  if (devInspectorActive && (keysJustPressed.has(",") || keysJustPressed.has("ArrowLeft"))) {
    const inspectorTargets = getDevInspectorTargets();
    if (inspectorTargets.length) {
      devInspectorIndex = (devInspectorIndex - 1 + inspectorTargets.length) % inspectorTargets.length;
      const target = inspectorTargets[devInspectorIndex];
      ensureInspectorState(target);
      setDevStatus(`Inspector: ${target.label}`, 1.2);
    }
  }
  if (devInspectorActive && (keysJustPressed.has(".") || keysJustPressed.has("ArrowRight"))) {
    const inspectorTargets = getDevInspectorTargets();
    if (inspectorTargets.length) {
      devInspectorIndex = (devInspectorIndex + 1) % inspectorTargets.length;
      const target = inspectorTargets[devInspectorIndex];
      ensureInspectorState(target);
      setDevStatus(`Inspector: ${target.label}`, 1.2);
    }
  }
  if (keysJustPressed.has("+")) {
    devInspectorZoom = Math.min(12, devInspectorZoom + 0.5);
    setDevStatus(`Inspector zoom ${devInspectorZoom.toFixed(1)}x`, 1.2);
  }
  if (keysJustPressed.has("-")) {
    devInspectorZoom = Math.max(0.5, devInspectorZoom - 0.5);
    setDevStatus(`Inspector zoom ${devInspectorZoom.toFixed(1)}x`, 1.2);
  }
  if (keysJustPressed.has("0")) {
  devInspectorZoom = 1.0;
    setDevStatus(`Inspector zoom reset`, 1.2);
  }
  if (keysJustPressed.has("r")) {
    // reset overrides for current inspector key
    const inspectorTargets = getDevInspectorTargets();
    if (inspectorTargets.length) {
      const target = inspectorTargets[devInspectorIndex % inspectorTargets.length];
      const key = target.key;
      if (devInspectorOverrides[key]) {
        delete devInspectorOverrides[key];
        markOverridesDirty();
        setDevStatus(`Overrides reset for ${target.label}`, 1.6);
      } else {
        setDevStatus(`No overrides to reset for ${target.label}`, 1.6);
      }
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
  // Manual save/export/import for inspector overrides
  if (keysJustPressed.has("y")) {
    saveDevOverrides(false);
  }
  if (keysJustPressed.has("e")) {
    exportDevOverridesToClipboard();
  }
  if (keysJustPressed.has("i")) {
    const raw = window.prompt('Paste overrides JSON to import:', '');
    if (raw !== null) importDevOverridesFromText(raw);
  }
  if (keysJustPressed.has("s")) {
    // show overrides hotkey pressed (silenced)
  }
  if (keysJustPressed.has("Enter") || keysJustPressed.has("\n")) {
    if (devInspectorActive) {
      const inspectorTargets = getDevInspectorTargets();
      const target = inspectorTargets[inspectorTargets.length ? devInspectorIndex % inspectorTargets.length : 0];
      if (devInspectorFlowActive) {
        // finish current state and move to next
        devInspectorCurrentStateIndex += 1;
        const stateList = ensureInspectorState(target);
        if (devInspectorCurrentStateIndex >= stateList.length) {
          devInspectorFlowActive = false;
          if (target) setDevStatus(`Pick flow complete for ${target.label}`, 2.2);
        } else {
          devInspectorSelectedState = stateList[devInspectorCurrentStateIndex];
          setDevStatus(`Pick frames for ${devInspectorSelectedState}`, 2.0);
        }
      } else {
        // If not in pick flow, cycle the selected animation state (idle->walk->attack->hurt->death->idle)
        const stateList = ensureInspectorState(target);
        if (!devInspectorSelectedState) devInspectorSelectedState = stateList[0];
        const curIdx = stateList.indexOf(devInspectorSelectedState);
        const nextIdx = (curIdx + 1) % stateList.length;
        devInspectorSelectedState = stateList[nextIdx];
        setDevStatus(`Inspector state: ${devInspectorSelectedState}`, 1.6);
      }
    }
  }

  // Hotkey: typed frames fallback (press 'f')
  if (keysJustPressed.has("t")) {
    const inspectorTargets = getDevInspectorTargets();
    if (!inspectorTargets.length) {
      setDevStatus('No inspector sprites loaded', 1.6);
    } else {
      const target = inspectorTargets[devInspectorIndex % inspectorTargets.length];
      const stateList = ensureInspectorState(target);
      const key = target.key;
      const defaultState = stateList[0] || 'walk';
      const targetState = devInspectorFlowActive
        ? (stateList[devInspectorCurrentStateIndex] || defaultState)
        : (devInspectorSelectedState || defaultState);
      // show in-canvas input UI for frames (less intrusive than window.prompt)
      showFrameEntryUI(key, targetState, (raw) => {
        if (raw === null) {
          setDevStatus('Frame entry cancelled', 1.2);
          return;
        }
        const frames = parseFrameList(raw);
        if (frames.length) {
          devInspectorOverrides[key] = devInspectorOverrides[key] || {};
          devInspectorOverrides[key][targetState] = { frames: frames.map((i) => i - 1) };
          const reloadPromise = target.kind === 'weapon'
            ? reloadProjectileClipForKey(key)
            : reloadEnemyClipsForKey(key);
          reloadPromise.then(() => {
            markOverridesDirty();
            setDevStatus(`Set ${targetState} frames: [${frames.join(',')}] for ${target.label || key}`, 2.6);
          }).catch(() => {
            setDevStatus('Failed to reload sprite after frame change', 2.6);
          });
        } else {
          setDevStatus('No valid frames parsed', 1.6);
        }
      });
    }
  }
}

function isAnyDialogActive() {
  return Boolean(
    window.DialogOverlay?.isVisible?.() ||
    window.UpgradeScreen?.isVisible?.()
  );
}

// In-canvas DOM entry UI
function showFrameEntryUI(key, state, callback) {
  // create overlay elements if missing
  let container = document.getElementById('dev-frame-entry-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'dev-frame-entry-container';
    container.style.position = 'fixed';
    container.style.left = '50%';
    container.style.top = '50%';
    container.style.transform = 'translate(-50%, -50%)';
    container.style.zIndex = 9999;
    container.style.background = 'rgba(8,12,20,0.96)';
    container.style.border = '2px solid rgba(120,200,255,0.9)';
    container.style.padding = '12px';
    container.style.borderRadius = '8px';
    container.style.color = '#eaf8ff';
    container.style.fontFamily = UI_FONT_FAMILY;
    container.style.minWidth = '360px';
    container.style.boxShadow = '0 8px 30px rgba(0,0,0,0.6)';

    const label = document.createElement('div');
    label.id = 'dev-frame-entry-label';
    label.style.marginBottom = '8px';
    container.appendChild(label);

    const input = document.createElement('input');
    input.id = 'dev-frame-entry-input';
    input.type = 'text';
    input.placeholder = 'e.g. 1,2,5-7';
    input.style.width = '100%';
    input.style.padding = '8px';
    input.style.border = '1px solid rgba(120,200,255,0.35)';
    input.style.borderRadius = '4px';
    input.style.background = 'rgba(12,18,28,0.9)';
    input.style.color = '#eaf8ff';
    container.appendChild(input);

    const buttons = document.createElement('div');
    buttons.style.marginTop = '8px';
    buttons.style.textAlign = 'right';

    const ok = document.createElement('button');
    ok.textContent = 'OK';
    ok.style.marginRight = '8px';
    ok.onclick = () => {
      const val = input.value;
      hideFrameEntryUI();
      callback(val);
    };
    const cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    cancel.onclick = () => {
      hideFrameEntryUI();
      callback(null);
    };
    buttons.appendChild(ok);
    buttons.appendChild(cancel);
    container.appendChild(buttons);

    document.body.appendChild(container);
  }
  // populate and show
  const label = document.getElementById('dev-frame-entry-label');
  const input = document.getElementById('dev-frame-entry-input');
  if (state === 'grid') {
    label.textContent = `Enter grid for ${key} (cols x rows), e.g. 6x9:`;
    input.placeholder = 'e.g. 6x9 (cols x rows)';
  } else {
    label.textContent = `Enter frames for ${key} ${state} (comma or ranges):`;
    input.placeholder = 'e.g. 1,2,5-7';
  }
  input.value = '';
  // remove any previous keydown listener to avoid duplicates
  input.onkeydown = null;
  input.addEventListener('keydown', function onKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const okBtn = document.querySelector('#dev-frame-entry-container button');
      if (okBtn) okBtn.click();
    }
  });
  input.focus();
}

function hideFrameEntryUI() {
  const container = document.getElementById('dev-frame-entry-container');
  if (container) container.remove();
}

// parse a user string like "1,2,5-7" into [1,2,5,6,7]
function parseFrameList(input) {
  if (!input || !String(input).trim()) return [];
  const parts = String(input).split(',').map(p => p.trim()).filter(Boolean);
  const out = new Set();
  for (const p of parts) {
    const m = p.match(/^(\d+)-(\d+)$/);
    if (m) {
      const a = Math.max(1, parseInt(m[1], 10));
      const b = Math.max(1, parseInt(m[2], 10));
      const from = Math.min(a, b);
      const to = Math.max(a, b);
      for (let i = from; i <= to; i++) out.add(i);
    } else {
      const n = parseInt(p, 10);
      if (Number.isFinite(n) && n > 0) out.add(n);
    }
  }
  return Array.from(out).sort((a,b) => a - b);
}

function updateGame(dt) {
  if (!player) return;
  handleDeveloperHotkeys();
  npcHarmonyBuffTimer = Math.max(0, npcHarmonyBuffTimer - dt);
  if (devInspectorActive) devInspectorTimer += dt;
  // autosave dev overrides after short debounce
  if (devOverridesDirty) {
    devOverridesSaveTimer += dt;
    if (devOverridesSaveTimer > 0.8) {
      saveDevOverrides(true);
    }
  }

  if (window.DialogOverlay?.consumeAction?.() || window.UpgradeScreen?.consumeAction?.()) {
    keysJustPressed.delete(" ");
    keysJustPressed.delete("pause");
    keysJustPressed.delete("restart");
    return;
  }
  if (isAnyDialogActive()) {
    keysJustPressed.delete(" ");
    return;
  }
  if (pendingUpgradeAfterSummary && window.UpgradeScreen && !window.UpgradeScreen.isVisible()) {
    clearKeyPickups();
    clearAllPowerUps();
    Effects.clear();
    window.UpgradeScreen.show(() => {});
    pendingUpgradeAfterSummary = false;
    keysJustPressed.delete(" ");
    return;
  }
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
  const deathFreezeActive = postDeathSequenceActive;
  if (deathFreezeActive) {
    keysJustPressed.clear();
  }

  window.postDeathSequenceActive = postDeathSequenceActive;

  let levelStatus = levelManager?.getStatus ? levelManager.getStatus() : null;
  let stage = levelStatus?.stage;
  // reset mini spawn flag when level changes
  const currentLevelNumber = levelManager?.getLevelNumber ? levelManager.getLevelNumber() : 1;
  if (lastLevelNumber === null) lastLevelNumber = currentLevelNumber;
  if (currentLevelNumber !== lastLevelNumber) {
    Spawner.resetLevelFlags(currentLevelNumber);
    lastLevelNumber = currentLevelNumber;
  }

  if (playerRespawnPending) {
    respawnTimer = Math.max(0, respawnTimer - dt);
    respawnIndicatorTimer -= dt;
    if (player && respawnIndicatorTimer <= 0) {
      addStatusText(player, "Exhausted", {
        color: "#ff9b9b",
        bgColor: "rgba(60, 20, 20, 0.88)",
        life: Math.min(0.6, RESPAWN_STATUS_INTERVAL),
        offsetY: player.radius + 34,
      });
      respawnIndicatorTimer = RESPAWN_STATUS_INTERVAL;
    }
    if (respawnTimer <= 0) {
      const oldPlayer = player;
      const respawnX = canvas.width / 2;
      player = createPlayerInstance(respawnX, HUD_HEIGHT + 40, assets.player);
      player.x = respawnX;
      const respawnTop = HUD_HEIGHT + Math.max(player.radius + 16, 28);
      player.y = respawnTop;
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
  }

  if (titleScreenActive) {
    if (!window.DialogOverlay?.isVisible()) {
      showTitleDialog();
    }
    keysJustPressed.delete(" ");
    return;
  }

  // If the how-to-play screen is active, Space should dismiss it and begin
  // the briefing/congregation flow.
  if (howToPlayActive) {
    if (!window.DialogOverlay?.isVisible()) {
      showHowToPlayDialog();
    }
    keysJustPressed.delete(" ");
    return;
  }

  if (visitorSession.active && keysJustPressed.has("7")) {
    visitorSession.summaryReason = visitorSession.summaryReason || "skipped";
    completeVisitorSession("skipped");
    keysJustPressed.delete(" ");
    keysJustPressed.delete("7");
    return;
  }
  if (visitorSession.active && visitorSession.summaryActive) {
    if (wasActionJustPressed("restart") || wasActionJustPressed("pause")) {
      const reason = visitorSession.summaryReason || "summary";
      visitorSession.summaryReason = null;
      visitorSession.awaitingSummaryConfirm = false;
      completeVisitorSession(reason);
      keysJustPressed.delete(" ");
    }
    return;
  }
  if (visitorSession.active && visitorSession.introActive) {
    if (
      wasActionJustPressed("restart") ||
      wasActionJustPressed("pause") ||
      keysJustPressed.has("7")
    ) {
      visitorSession.introActive = false;
      keysJustPressed.delete(" ");
      keysJustPressed.delete("7");
    }
    return;
  }
  if (levelAnnouncements.length && levelAnnouncements[0].requiresConfirm) {
    const currentAnnouncement = levelAnnouncements[0];
    const isSummary = isBattleSummaryAnnouncement(currentAnnouncement);
    if (isSummary) {
      if (!window.DialogOverlay?.isVisible()) {
        const battleSummary = levelManager?.getLastBattleSummary?.() || {};
        const savedCount = Number.isFinite(battleSummary?.savedCount) ? battleSummary.savedCount : 0;
        const lostCount = Number.isFinite(battleSummary?.lostCount) ? battleSummary.lostCount : 0;
        const upgradeAfter = Boolean(window.UpgradeScreen);
        const portraits = {
          saved: Array.isArray(battleSummary.savedPortraits) ? battleSummary.savedPortraits : [],
          lost: Array.isArray(battleSummary.lostPortraits) ? battleSummary.lostPortraits : [],
        };
        showBattleSummaryDialog(currentAnnouncement, savedCount, lostCount, upgradeAfter, portraits);
      }
      return;
    }
    if (wasActionJustPressed("pause") || wasActionJustPressed("restart")) {
      dismissCurrentLevelAnnouncement();
      keysJustPressed.delete(" ");
    }
    return;
  }

  let congregationStageActive = stage === "levelIntro";
  let playerUpdatedDuringCongregation = false;
  if (congregationStageActive) {
    updateCongregationMembers(dt);
    resolveCongregationMemberCollisions();
    updatePlayerDuringCongregation(dt);
    playerUpdatedDuringCongregation = true;
    resolveCongregationCollisions();
    // Allow Space (restart/pause action) to advance from briefing->congregation
    if (wasActionJustPressed("pause") || wasActionJustPressed("restart")) {
      // If the level manager is in briefing, advance it; otherwise advance congregation.
      try {
        const status = levelManager?.getStatus ? levelManager.getStatus() : null;
        if (status?.stage === 'briefing' && typeof levelManager.advanceFromBriefing === 'function') {
          levelManager.advanceFromBriefing();
          paused = false; // unpause to begin levelIntro visuals
          keysJustPressed.delete(' ');
          levelStatus = levelManager?.getStatus ? levelManager.getStatus() : null;
          stage = levelStatus?.stage;
        } else if (wasActionJustPressed("pause")) {
          levelManager?.advanceFromCongregation?.();
          keysJustPressed.delete(" ");
          levelStatus = levelManager?.getStatus ? levelManager.getStatus() : null;
          stage = levelStatus?.stage;
        }
      } catch (e) {}
    }
    congregationStageActive = stage === "levelIntro";
    if (!congregationStageActive) {
      playerUpdatedDuringCongregation = false;
    }
  }

  if (cameraShakeTimer > 0) {
    cameraShakeTimer = Math.max(0, cameraShakeTimer - dt);
  }

  // Parallax camera offset: allow the player to shift the arena a little left/right
  try {
    const desired = player.x - canvas.width / 2;
    const clamped = Math.max(-CAMERA_SCROLL_LIMIT, Math.min(CAMERA_SCROLL_LIMIT, desired));
    cameraOffsetX += (clamped - cameraOffsetX) * Math.min(1, dt * 8);
    // map cameraOffsetX to per-layer pan (floor will not parallax independently)
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

  if (window.DialogOverlay?.consumeAction?.() || window.UpgradeScreen?.consumeAction?.()) {
    return;
  }
  const overlayActive = Boolean(
    window.DialogOverlay?.isVisible?.() || window.UpgradeScreen?.isVisible?.(),
  );
  if (overlayActive) {
    keysJustPressed.delete(" ");
  }
  if (!overlayActive && wasActionJustPressed("pause")) {
    paused = !paused;
    if (paused && !gameOver) {
      showPauseDialog();
    } else if (!paused) {
      resumeFromPause();
    }
  }

  if (gameOver) {
    player.animator.update(dt);
    if (wasActionJustPressed("restart")) restartGame();
    return;
  }

  if (paused) return;

  if (!gameOver && levelManager && !congregationStageActive) {
    levelManager.update(dt);
    levelStatus = levelManager.getStatus ? levelManager.getStatus() : null;
    stage = levelStatus?.stage;
  }

  if (!playerUpdatedDuringCongregation) {
    if (!deathFreezeActive) {
      updateAimFromKeyboard();
      updateAimAssist();
      player.update(dt);
    } else {
      updateAimAssist();
      if (player && player.state === "death") {
        player.animator.update(dt);
      }
    }
  } else {
    // already updated aim above; ensure aim overlays still receive the latest data
    updateAimAssist();
  }
  if (gameOver) return;
  resolveEntityObstacles(player);
  resolveEntityCollisions(player, enemies, { allowPush: false, overlapScale: 0.6 });
  clampEntityToBounds(player);

  if (visitorSession.active) {
    updateVisitorSession(dt);
    return;
  }

  if (!levelManager?.isActive()) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      const difficulty = Math.min(1.4, 1 + score / 2200);
  spawnEnemy();
  spawnTimer = 4.0 / difficulty;
    }
  }

  enemies.forEach((enemy) => {
    enemy.update(dt);
    enemy.spawnOffscreenTimer = Math.max(0, (enemy.spawnOffscreenTimer || 0) - dt);
    if (enemy.spawnOffscreenTimer <= 0) {
      enemy.ignoreWorldBounds = false;
      enemy.spawnPushGrace = Math.max(enemy.spawnPushGrace || 0, 0.4);
    }
    enemy.touchCooldown = Math.max(0, (enemy.touchCooldown || 0) - dt);
    if (enemy.spawnOffscreenTimer > 0) {
      return;
    }
    enemy.spawnPushGrace = Math.max(0, (enemy.spawnPushGrace || 0) - dt);
    applyEnemyTouchDamage(enemy);
    resolveEntityCollisions(enemy, [player], { allowPush: true, overlapScale: 0.6 });
    resolveEntityCollisions(enemy, enemies, { allowPush: true, overlapScale: 0.85 });
    resolveEntityObstacles(enemy);
    clampEntityToBounds(enemy);
  });

  if (player.shieldTimer > 0) {
    enemies.forEach((enemy) => {
      if (enemy.dead || enemy.state === "death") return;
      applyShieldImpact(enemy);
    });
  }

  if (activeBoss) {
    activeBoss.update(dt);
    if (activeBoss.removed) {
      activeBoss = null;
    }
  }

  // vampire updates and shield impacts removed
  updateCozyNpcs(dt);
  updateAnimals(dt);
  updateUtilityPowerUps(dt);
  updateKeyPickups(dt);
  updateKeyRushState(dt);
  powerUpRespawnTimer = Math.max(0, powerUpRespawnTimer - dt);
  // Ensure power-ups obey spawn rules per stage
  try {
    const stageName = levelStatus?.stage;
    const battleStageAllowsPowerUps =
      stageName === "battleIntro" ||
      stageName === "hordeActive" ||
      stageName === "bossActive" ||
      stageName === "visitorMinigame";
    const shouldEnsurePowerUp =
      !titleScreenActive &&
      !paused &&
      !gameOver &&
      player &&
      player.state !== "death" &&
      battleStageAllowsPowerUps;
    const delayingForNpcProcession = stageName === "npcArrival" && npcProcessionActive;
    if (shouldEnsurePowerUp && !delayingForNpcProcession) {
      if (canSpawnUtilityPowerUp()) {
        spawnUtilityPowerUp();
      }
      if (battleStageAllowsPowerUps && canSpawnWeaponPowerUp()) {
        spawnWeaponPowerAnimal();
      }
    }
  } catch (err) {
    console.warn && console.warn('ensure-powerup check failed', err);
  }
  updateBossHazards(dt);
  updateFloatingTexts(dt);
  updateLevelAnnouncements(dt);
  updateDevStatus(dt);
  updateAimAssist();
  updateEffects(dt);
  if (!levelManager?.isActive()) {
    maintainMiniImpHorde(levelStatus);
    maintainSkeletonHorde();
  }

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    if (enemy.dead) {
      if (!enemy.scoreGranted) {
        // Prefer explicit config score if present (synthesized for MiniFolks)
        const explicitScore = enemy.config && typeof enemy.config.score === 'number' ? enemy.config.score : null;
        const typeDef = ENEMY_TYPES && ENEMY_TYPES[enemy.type];
        const typeScore = typeDef && typeof typeDef.score === 'number' ? typeDef.score : null;
        const awarded = explicitScore ?? typeScore ?? 0;
        if (awarded > 0) score += awarded;
        enemy.scoreGranted = true;
      }
        const killedByPrayer = Boolean(enemy.killedByPrayerBomb);
        if (!killedByPrayer && player && typeof player.addPrayerCharge === "function") {
          const modifier = PRAYER_BOMB_CHARGE_TYPE_MODIFIERS[enemy.type] ?? 1;
          const chargeAmount = PRAYER_BOMB_CHARGE_PER_KILL * modifier;
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
                  if (npc.faith <= 0) continue; // drained NPCs must be personally rescued
                  if (npc.faith >= maxFaith) continue;
                }
                npc.receiveFaith(faithPerNpc);
              }
            }
          } catch (e) {}
        }
        lastEnemyDeathPosition = { x: enemy.x, y: enemy.y };
        maybeDropKeysFromEnemy(enemy);
        enemies.splice(i, 1);
    }
  }

    // Melee attack logic: only trigger once per key press, deal damage once, and disappear
  if (!window._meleeAttackState)
    window._meleeAttackState = {
      active: false,
      fade: 0,
      cooldown: 0,
      buttonDown: false,
      chargeTimer: 0,
      isCharging: false,
      isRushing: false,
      rushDir: { x: 1, y: 0 },
      rushDistanceRemaining: 0,
      rushHitEntities: null,
      rushCooldown: 0,
      rushDustAccumulator: 0,
      chargeFlashTriggered: false,
    awaitRush: false,
    awaitTimer: 0,
    swooshTimer: 0,
    swooshDir: { x: 1, y: 0 },
    projectileBlockTimer: 0,
  };
  const meleeAttackState = window._meleeAttackState;
  const input = window.Input;
const MELEE_OFFSET = 54 * WORLD_SCALE;
const MELEE_DAMAGE_KNOCKBACK = 48 * WORLD_SCALE;
const MELEE_PUSHBACK_STRENGTH = 36 * WORLD_SCALE;
const MELEE_DAMAGE_DURATION = 0.25;
const MELEE_COOLDOWN = 0.55;
const MELEE_DOUBLE_TAP_WINDOW = 0.18;
const MELEE_HOLD_CHARGE_TIME = 1.5;
const MELEE_BASE_DAMAGE = 500;
const MELEE_SWING_LENGTH = 200;
const MELEE_PROJECTILE_COOLDOWN_AFTER = 0.5;
  const RUSH_DISTANCE = 150 * WORLD_SCALE;
  const RUSH_SPEED = 1200 * SPEED_SCALE;
  const RUSH_DAMAGE = 250;
  const RUSH_RADIUS = 50 * WORLD_SCALE;
  const RUSH_PUSHBACK_RADIUS = 52 * WORLD_SCALE;
  const RUSH_PUSHBACK_STRENGTH = 50 * WORLD_SCALE;
  const RUSH_COOLDOWN = 3.0;
const RUSH_DUST_SPACING = 26 * WORLD_SCALE;
const RUSH_INVULNERABILITY = 0.4;
const MELEE_SWING_DURATION = 0.2;
const DIVINE_SHOT_DAMAGE = 1200;
  const DIVINE_SHOT_SPEED = 920 * SPEED_SCALE;
  const DIVINE_SHOT_LIFE = 2.8;
  const DIVINE_SHOT_AUTO_AIM_DURATION = 1.6;
  const DIVINE_SHOT_AUTO_AIM_STRENGTH = 3.2;
  const DIVINE_SHOT_AUTO_AIM_MIN_DOT = 0.25;
  const DIVINE_SHOT_PROJECTILE_PRIORITY = 5;
  if (input && player) {
    const playerAlive = Boolean(player && player.state !== "death");
    if (!playerAlive) {
      meleeAttackState.buttonDown = false;
      meleeAttackState.isCharging = false;
      meleeAttackState.awaitRush = false;
      clearDivineChargeSparkVisual();
      return;
    }
    meleeAttackState.holdTime = MELEE_HOLD_CHARGE_TIME;
    meleeAttackState.cooldown = Math.max(0, (meleeAttackState.cooldown || 0) - dt);
    const prevRushCooldown = Math.max(0, meleeAttackState.rushCooldown || 0);
    meleeAttackState.rushCooldown = Math.max(0, prevRushCooldown - dt);
    const rushReadyNow = meleeAttackState.rushCooldown === 0 && !meleeAttackState.isRushing;
    if (prevRushCooldown > 0 && rushReadyNow && player) {
      spawnFlashEffect(player.x, player.y + (player.radius || 24));
    }

    const getMeleeDirection = () => {
      let dir = input.lastMovementDirection || { x: 1, y: 0 };
      if (dir.x === 0 && dir.y === 0) {
        const aim = player.aim || { x: 1, y: 0 };
        dir = { x: aim.x, y: aim.y };
      }
      return normalizeVector(dir.x, dir.y);
    };

    const performRushMovement = (direction) => {
      if (!meleeAttackState.isRushing || !player) return;
      const movement = Math.min(meleeAttackState.rushDistanceRemaining, RUSH_SPEED * dt);
      player.x += direction.x * movement;
      player.y += direction.y * movement;
      resolveEntityObstacles(player);
      clampEntityToBounds(player);
      meleeAttackState.rushDistanceRemaining -= movement;
      meleeAttackState.rushDustAccumulator += movement;
      while (meleeAttackState.rushDustAccumulator >= RUSH_DUST_SPACING) {
        meleeAttackState.rushDustAccumulator -= RUSH_DUST_SPACING;
        const dustX = player.x - direction.x * 12;
        const dustY = player.y - direction.y * 12;
        spawnImpactDustEffect(dustX, dustY + player.radius * 0.6, player.radius);
      }
      for (const enemy of enemies) {
        if (!enemy || enemy.dead || enemy.state === "death") continue;
        if (meleeAttackState.rushHitEntities?.has(enemy)) continue;
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const dist = Math.hypot(dx, dy);
        const enemyRadius = enemy.config?.hitRadius || enemy.radius || 0;
        if (dist < RUSH_RADIUS + enemyRadius) {
          enemy.takeDamage(RUSH_DAMAGE);
          const pushDx = enemy.x - player.x;
          const pushDy = enemy.y - player.y;
          const pushDist = Math.hypot(pushDx, pushDy) || 1;
          const pushNormX = pushDx / pushDist;
          const pushNormY = pushDy / pushDist;
          const overlapPush = Math.max(0, RUSH_PUSHBACK_RADIUS + enemyRadius - dist);
          enemy.x += pushNormX * Math.min(overlapPush, RUSH_PUSHBACK_STRENGTH * 0.5);
          enemy.y += pushNormY * Math.min(overlapPush, RUSH_PUSHBACK_STRENGTH * 0.5);
          spawnFlashEffect(enemy.x, enemy.y - enemyRadius / 2);
          if (typeof showDamage === "function") {
            showDamage(enemy, RUSH_DAMAGE, { color: "#ffc8a2" });
          }
          meleeAttackState.rushHitEntities?.add(enemy);
        }
      }
      if (meleeAttackState.rushDistanceRemaining <= 0) {
      meleeAttackState.isRushing = false;
      meleeAttackState.rushHitEntities = null;
      meleeAttackState.rushCooldown = RUSH_COOLDOWN;
      if (player) player.invulnerableTimer = Math.max(player.invulnerableTimer, RUSH_INVULNERABILITY);
    }
    };

    const startRush = (direction) => {
      if (!direction || (direction.x === 0 && direction.y === 0)) return;
      const normalized = normalizeVector(direction.x, direction.y);
      meleeAttackState.isRushing = true;
      meleeAttackState.rushDir = normalized;
      meleeAttackState.rushDistanceRemaining = RUSH_DISTANCE;
      meleeAttackState.rushHitEntities = new Set();
      meleeAttackState.cooldown = MELEE_COOLDOWN;
      meleeAttackState.chargeTimer = 0;
      meleeAttackState.isCharging = false;
      meleeAttackState.active = false;
      meleeAttackState.fade = 0;
      meleeAttackState.chargeFlashTriggered = false;
      meleeAttackState.rushDustAccumulator = 0;
      meleeAttackState.rushCooldown = 0;
      if (player) player.invulnerableTimer = Math.max(player.invulnerableTimer, RUSH_INVULNERABILITY);
    };

    function findDivineShotTarget(direction) {
      if (!player || !direction) return null;
      const normalized = normalizeVector(direction.x, direction.y);
      if (normalized.x === 0 && normalized.y === 0) return null;
      let best = null;
      let bestScore = DIVINE_SHOT_AUTO_AIM_MIN_DOT;
      const maxDimension = Math.max(canvas.width, canvas.height, 1);
      for (const enemy of enemies) {
        if (!enemy || enemy.dead || enemy.state === "death" || enemy.departed) continue;
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist === 0) continue;
        const toEnemy = normalizeVector(dx, dy);
        const dot = normalized.x * toEnemy.x + normalized.y * toEnemy.y;
        if (dot < DIVINE_SHOT_AUTO_AIM_MIN_DOT) continue;
        const score = dot - dist / maxDimension;
        if (score > bestScore) {
          bestScore = score;
          best = enemy;
        }
      }
      return best;
    }

    function executeMeleeAttack(direction) {
      if (!player || !direction) return;
      const normalized = normalizeVector(direction.x, direction.y);
    meleeAttackState.active = true;
    meleeAttackState.fade = MELEE_DAMAGE_DURATION;
    meleeAttackState.cooldown = MELEE_COOLDOWN;
    meleeAttackState.swooshTimer = MELEE_SWING_DURATION;
    meleeAttackState.swooshDir = normalized;
    meleeAttackState.projectileBlockTimer = MELEE_SWING_DURATION + MELEE_PROJECTILE_COOLDOWN_AFTER;
      const meleeBase = MELEE_BASE_DAMAGE;
      const meleeStatMultiplier = window.StatsManager
        ? window.StatsManager.getStatMultiplier("melee_attack_damage") || 1
        : 1;
      const meleeDamage = Math.max(1, Math.round(meleeBase * meleeStatMultiplier));
      const swooshImg = assets?.effects?.meleeSwoosh;
      const baseWidth = swooshImg?.width || 64;
      const baseHeight = swooshImg?.height || 16;
      const targetLength = MELEE_SWING_LENGTH * WORLD_SCALE * meleeStatMultiplier;
      const swingScale = targetLength / Math.max(1, baseWidth);
      const swingLength = baseWidth * swingScale;
      const swingHeight = baseHeight * swingScale;
      const swingOffset = Math.max(player.radius * 0.25, swingHeight * 0.15);
      meleeAttackState.swingLength = swingLength;
      meleeAttackState.swingHeight = swingHeight;
      meleeAttackState.swingScale = swingScale;
      const originX = player.x - normalized.x * swingOffset;
      const originY = player.y - normalized.y * swingOffset;
      const perpDir = { x: -normalized.y, y: normalized.x };
      const allowanceRadius = (target) => target?.radius || target?.config?.hitRadius || 0;
      const hitTarget = (target) => {
        if (!target || target.dead || target.state === "death") return false;
        const relX = target.x - originX;
        const relY = target.y - originY;
        const forward = relX * normalized.x + relY * normalized.y;
        if (forward < 0 || forward > swingLength) return false;
        const perp = Math.abs(relX * perpDir.x + relY * perpDir.y);
        const allowance = allowanceRadius(target);
        if (perp > swingHeight / 2 + allowance) return false;
        if (typeof target.takeDamage === "function") {
          target.takeDamage(meleeDamage);
        } else if (typeof target.health === "number") {
          target.health = Math.max(0, target.health - meleeDamage);
        }
        spawnFlashEffect(target.x, target.y - allowance * 0.5);
        if (target.health > 0 && typeof target.takeDamage === "function") {
          target.x += normalized.x * MELEE_DAMAGE_KNOCKBACK;
          target.y += normalized.y * MELEE_DAMAGE_KNOCKBACK;
        }
        if (typeof showDamage === "function") {
          showDamage(target, meleeDamage, { color: "#ff4444", critical: true });
        }
        return true;
      };

      for (const enemy of enemies) {
        hitTarget(enemy);
      }
      hitTarget(activeBoss);

      for (const projectile of projectiles) {
        if (!projectile || projectile.dead || projectile.friendly) continue;
        if (isBossProjectile(projectile)) continue;
        const relX = projectile.x - originX;
        const relY = projectile.y - originY;
        const forwardProj = relX * normalized.x + relY * normalized.y;
        if (forwardProj < 0 || forwardProj > swingLength) continue;
        const perpProj = Math.abs(relX * perpDir.x + relY * perpDir.y);
        const allowanceProj = projectile.radius || projectile.config?.radius || 0;
        if (perpProj > swingHeight / 2 + allowanceProj) continue;
        projectile.dead = true;
        spawnFlashEffect(projectile.x, projectile.y);
      }
    }

    const spawnDivineShot = (direction) => {
      const normalized = normalizeVector(direction.x, direction.y);
      if (normalized.x === 0 && normalized.y === 0) return;
      const startX = player.x + normalized.x * player.radius * 1.4;
      const startY = player.y + normalized.y * player.radius * 1.4;
      const targetedEnemy = findDivineShotTarget(direction);
      spawnProjectile("fire", startX, startY, normalized.x, normalized.y, {
        damage: DIVINE_SHOT_DAMAGE * 1,
        speed: DIVINE_SHOT_SPEED * 1.25,
        life: DIVINE_SHOT_LIFE * 2,
        pierce: true,
        radius: 56,
        scale: 5.2,
        loopFrames: true,
        friendly: true,
        source: player,
        homingTarget: targetedEnemy,
        homingDuration: targetedEnemy ? DIVINE_SHOT_AUTO_AIM_DURATION : 0,
        homingStrength: targetedEnemy ? DIVINE_SHOT_AUTO_AIM_STRENGTH : 0,
        priority: DIVINE_SHOT_PROJECTILE_PRIORITY,
        isDivineShot: true,
      });
      meleeAttackState.cooldown = MELEE_COOLDOWN;
      meleeAttackState.rushDustAccumulator = 0;
    };

    const direction = getMeleeDirection();
    const now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    const isButtonDown = Boolean(input.nesAButtonActive);
    const wasButtonDown = Boolean(meleeAttackState.buttonDown);
    let rushTriggered = false;
    let meleeAttackTriggered = false;

    if (isButtonDown && !wasButtonDown) {
      meleeAttackState.buttonDown = true;
      meleeAttackState.chargeTimer = 0;
      meleeAttackState.isCharging = false;
      clearDivineChargeSparkVisual();
      meleeAttackState.chargeFlashTriggered = false;
      if (
        meleeAttackState.awaitRush &&
        meleeAttackState.awaitTimer > 0 &&
        !meleeAttackState.isRushing &&
        meleeAttackState.rushCooldown === 0
      ) {
        startRush(direction);
        rushTriggered = true;
        meleeAttackState.awaitRush = false;
        meleeAttackState.awaitTimer = 0;
      }
      if (!rushTriggered) {
        executeMeleeAttack(direction);
        meleeAttackTriggered = true;
      }
    }

    if (!rushTriggered && isButtonDown && meleeAttackState.buttonDown && !meleeAttackState.isRushing) {
      meleeAttackState.chargeTimer += dt;
      if (!meleeAttackState.isCharging && meleeAttackState.chargeTimer >= MELEE_HOLD_CHARGE_TIME) {
        meleeAttackState.isCharging = true;
        if (!meleeAttackState.chargeFlashTriggered) {
          spawnFlashEffect(player.x, player.y - player.radius * 0.5);
          meleeAttackState.chargeFlashTriggered = true;
        }
        spawnDivineChargeSparkVisual();
      }
    }

    if (!isButtonDown && wasButtonDown) {
      meleeAttackState.buttonDown = false;
      if (meleeAttackState.isRushing) {
        // Let the rush finish on its own.
      } else if (meleeAttackState.isCharging) {
        spawnDivineShot(direction);
      }
      else if (!meleeAttackTriggered) {
        executeMeleeAttack(direction);
      }
      meleeAttackState.chargeTimer = 0;
      meleeAttackState.isCharging = false;
      clearDivineChargeSparkVisual();
      meleeAttackState.chargeFlashTriggered = false;
      meleeAttackState.awaitRush = true;
      meleeAttackState.awaitTimer = MELEE_DOUBLE_TAP_WINDOW;
    }

    if (meleeAttackState.awaitRush) {
      meleeAttackState.awaitTimer = Math.max(0, meleeAttackState.awaitTimer - dt);
      if (meleeAttackState.awaitTimer === 0) {
        meleeAttackState.awaitRush = false;
      }
    }

    if (meleeAttackState.isCharging) {
      updateDivineChargeSparkVisual();
    } else {
      clearDivineChargeSparkVisual();
    }

    if (meleeAttackState.isRushing) {
      performRushMovement(meleeAttackState.rushDir);
    }

    if (meleeAttackState.active) {
      meleeAttackState.fade = Math.max(0, meleeAttackState.fade - dt);
      if (meleeAttackState.fade === 0) {
        meleeAttackState.active = false;
      }
    }
    if (meleeAttackState.swooshTimer > 0) {
      meleeAttackState.swooshTimer = Math.max(0, meleeAttackState.swooshTimer - dt);
    }
    if (meleeAttackState.projectileBlockTimer > 0) {
      meleeAttackState.projectileBlockTimer = Math.max(
        0,
        meleeAttackState.projectileBlockTimer - dt,
      );
    }
  }

  projectiles.forEach((projectile) => projectile.update(dt));

  function adjustNpcArrowDamageAgainstGhost(projectile, enemy, baseDamage) {
    if (
      projectile.type === "arrow" &&
      enemy.type === "miniGhost" &&
      projectile.source instanceof CozyNpc
    ) {
      const reduced = Math.round(baseDamage * 0.5);
      return Math.max(1, reduced);
    }
    return baseDamage;
  }

  for (const projectile of projectiles) {
    if (projectile.dead) continue;

  if (projectile.friendly) {

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
        let projectileDamage = projectile.getDamage();
        projectileDamage = adjustNpcArrowDamageAgainstGhost(projectile, enemy, projectileDamage);
        enemy.takeDamage(projectileDamage);
  // no arrow-hit gating for health bars
        if (
          projectile.type === "fire" ||
          projectile.type === "heart" ||
          projectile.type === "faith_cannon"
        ) {
          // Flash sprite hit animation (flash1-14) now used for all friendly spark hits.
          spawnFlashEffect(enemy.x, enemy.y - enemy.config.hitRadius / 2);
        }
        if (enemy.health <= 0 && prevHealth > 0 && projectile.type === "arrow") {
          spawnImpactEffect(enemy.x, enemy.y - enemy.config.hitRadius / 2);
        }
        projectile.onHit(enemy);
        if (projectile.dead) break;
      }

      if (projectile.dead) continue;

  // coins are friendly projectiles but no longer auto-heal NPCs via hits
  // continue handling vampires and other friendly projectile collisions
  // vampire projectile handling removed

      if (!projectile.dead && activeBoss && !activeBoss.dead && !activeBoss.defeated) {
        if (!projectile.hitEntities.has(activeBoss) && projectile.hitTest(activeBoss)) {
          projectile.hitEntities.add(activeBoss);
          if (projectile.type === "wisdom_missle") {
            detonateWisdomMissleProjectile(projectile);
          } else if (projectile.type === "faith_cannon") {
            detonateFaithCannonProjectile(projectile, { endOfRange: false });
          } else {
            activeBoss.takeDamage(projectile.getDamage(), projectile);
            if (
              projectile.type === "fire" ||
              projectile.type === "heart" ||
              projectile.type === "faith_cannon"
            ) {
              spawnFlashEffect(activeBoss.x, activeBoss.y - activeBoss.radius / 2);
            }
            projectile.onHit(activeBoss);
            if (!projectile.pierce) projectile.dead = true;
          }
        }
      }
    } else {
      if (player && player.state !== "death" && projectile.hitTest(player)) {
        if (player.shieldTimer > 0) {
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

  // Projectile clashes use a priority value so Divine Shot can beat normal shots while
  // future boss projectiles can be flagged with a higher priority to resist it.
  const friendlyProjectiles = projectiles.filter((proj) => proj.friendly && !proj.dead);
  const hostileProjectiles = projectiles.filter((proj) => !proj.friendly && !proj.dead);
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
      if (hostileIsBoss && friendlyFromPlayer) {
        friendlyDies = true;
      } else if (friendlyPriority > hostilePriority) {
        hostileDies = true;
      } else if (friendlyPriority < hostilePriority) {
        friendlyDies = true;
      } else {
        friendlyDies = true;
        hostileDies = true;
      }
      if (hostileDies) hostile.dead = true;
      if (friendlyDies) friendly.dead = true;
      spawnImpactEffect((friendly.x + hostile.x) / 2, (friendly.y + hostile.y) / 2);
      break;
    }
  }

  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    if (projectiles[i].dead) {
      projectiles.splice(i, 1);
    }
  }
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

function drawDevInspector() {
  const inspectorTargets = getDevInspectorTargets();
  if (!inspectorTargets.length) return;
  devInspectorIndex = devInspectorIndex % inspectorTargets.length;
  const target = inspectorTargets[devInspectorIndex];
  const key = target.key;
  const label = target.label;
  const stateList = ensureInspectorState(target);
  const clips = getInspectorClipBundle(target);
  const padding = 18;
  const panelW = Math.min(1200, canvas.width - 80);
  const panelH = Math.min(860, canvas.height - 80);
  const px = (canvas.width - panelW) / 2;
  const py = (canvas.height - panelH) / 2;
  ctx.save();
  ctx.fillStyle = 'rgba(6,10,16,0.96)';
  ctx.fillRect(px, py, panelW, panelH);
  ctx.strokeStyle = 'rgba(120,200,255,0.9)';
  ctx.lineWidth = 2;
  ctx.strokeRect(px, py, panelW, panelH);
  ctx.fillStyle = '#eaf8ff';
  ctx.font = `18px ${UI_FONT_FAMILY}`;
  ctx.textAlign = 'left';
  const headerY = py + 28;
  ctx.fillText(`Inspector: ${label}`, px + padding, headerY);
  // show any manual grid override for this sheet (top-left, with background)
  try {
    const imgSrc = (clips.idle || Object.values(clips)[0])?.image?.src || '';
    const basename = imgSrc.split('/').pop() || '';
    const override = devManualGridOverrides[basename.trim().toLowerCase()];
    if (override) {
      const label = `Manual grid override: ${override.cols} x ${override.rows}`;
      ctx.font = `12px ${UI_FONT_FAMILY}`;
      ctx.fillStyle = 'rgba(10,14,20,0.88)';
      const lw = Math.min(420, ctx.measureText(label).width + 18);
      ctx.fillRect(px + padding, py + 40 - 14, lw, 20);
      ctx.fillStyle = '#9bdcff';
      ctx.fillText(label, px + padding + 6, py + 40);
    }
  } catch (e) {}

  // draw small Prev/Next/Grid/Type buttons
  const btnW = 88;
  const btnH = 28;
  const btnY = py + 16;
  // positions match handleInspectorClick: Prev, Next, Grid, Type (from left to right)
  const prevX = px + panelW - padding - btnW * 4 - 16;
  const nextX = px + panelW - padding - btnW * 3 - 12;
  const gridBtnX = px + panelW - padding - btnW * 2 - 8;
  const typeX = px + panelW - padding - btnW;
  // debug: show button rects in console occasionally
  if (devInspectorTimer < 0.1) {
    console.debug('Inspector buttons rects', { prev: [prevX, btnY, btnW, btnH], next: [nextX, btnY, btnW, btnH], grid: [gridBtnX, btnY, btnW, btnH], type: [typeX, btnY, btnW, btnH] });
  }
  // prev
  ctx.save();
  ctx.fillStyle = 'rgba(24,34,54,0.95)';
  ctx.fillRect(prevX, btnY, btnW, btnH);
  ctx.strokeStyle = 'rgba(120,200,255,0.9)';
  ctx.strokeRect(prevX, btnY, btnW, btnH);
  ctx.fillStyle = '#dff7ff';
  ctx.font = `13px ${UI_FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.fillText('Prev Key', prevX + btnW / 2, btnY + btnH / 2 + 5);
  ctx.restore();
  // next
  ctx.save();
  ctx.fillStyle = 'rgba(24,34,54,0.95)';
  ctx.fillRect(nextX, btnY, btnW, btnH);
  ctx.strokeStyle = 'rgba(120,200,255,0.9)';
  ctx.strokeRect(nextX, btnY, btnW, btnH);
  ctx.fillStyle = '#dff7ff';
  ctx.fillText('Next Key', nextX + btnW / 2, btnY + btnH / 2 + 5);
  ctx.restore();
  // grid
  ctx.save();
  ctx.fillStyle = 'rgba(30,40,60,0.96)';
  ctx.fillRect(gridBtnX, btnY, btnW, btnH);
  ctx.strokeStyle = 'rgba(120,200,255,0.9)';
  ctx.strokeRect(gridBtnX, btnY, btnW, btnH);
  ctx.fillStyle = '#dff7ff';
  ctx.fillText('Grid', gridBtnX + btnW / 2, btnY + btnH / 2 + 5);
  ctx.restore();
  // type frames
  ctx.save();
  ctx.fillStyle = 'rgba(40,56,80,0.98)';
  ctx.fillRect(typeX, btnY, btnW, btnH);
  ctx.strokeStyle = 'rgba(120,200,255,0.95)';
  ctx.strokeRect(typeX, btnY, btnW, btnH);
  ctx.fillStyle = '#fff';
  ctx.fillText('Type Frames', typeX + btnW / 2, btnY + btnH / 2 + 5);
  ctx.restore();

  // Determine a single representative clip (use idle if available or first)
  const clip = clips.walk || clips.idle || Object.values(clips)[0];
  if (!clip) {
    ctx.fillStyle = '#cfe8ff';
    ctx.font = `14px ${UI_FONT_FAMILY}`;
    ctx.fillText('No sprite sheet available for this key.', px + padding, py + 60);
    ctx.restore();
    return;
  }

  // Defensive: ensure image and frame sizes are valid before attempting grid math
  if (!clip.image || !Number.isFinite(clip.frameWidth) || clip.frameWidth <= 0 || !Number.isFinite(clip.frameHeight) || clip.frameHeight <= 0) {
    ctx.fillStyle = '#cfe8ff';
    ctx.font = `14px ${UI_FONT_FAMILY}`;
    ctx.fillText('Sprite not ready: frame size unknown. Try saving again or wait a moment.', px + padding, py + 60);
    // attempt to trigger a reload of this key's clips in background (non-blocking)
    try {
      const retryTargets = getDevInspectorTargets();
      if (retryTargets.length) {
        const retryKey = retryTargets[devInspectorIndex % retryTargets.length].key;
        const reloadPromise = target.kind === 'weapon'
          ? reloadProjectileClipForKey(retryKey)
          : reloadEnemyClipsForKey(retryKey);
        reloadPromise.catch(() => {});
      }
    } catch (e) {}
    ctx.restore();
    return;
  }

  // Defensive: ensure clip has a valid image and frame sizes
  const badFrame = !clip.image || !Number.isFinite(clip.frameWidth) || clip.frameWidth <= 0 || !Number.isFinite(clip.frameHeight) || clip.frameHeight <= 0;
  if (badFrame) {
    ctx.fillStyle = '#ffcdb0';
    ctx.font = `14px ${UI_FONT_FAMILY}`;
    ctx.fillText('Invalid sprite/frame size for this sheet — check console for details.', px + padding, py + 60);
    try {
      console.warn('drawDevInspector: invalid clip for key', { key, clip });
    } catch (e) {
      // ignore
    }
    ctx.restore();
    return;
  }

  // Compute cols/rows for the sheet grid (from clip)
  const cols = Math.max(1, Math.floor(clip.image.width / clip.frameWidth));
  const rows = Math.max(1, Math.floor(clip.image.height / clip.frameHeight));

  // color map shared by cell highlights and legend
  const colorMap = {
    idle: 'rgba(100,255,160,0.9)',
    walk: 'rgba(120,200,255,0.9)',
    attack: 'rgba(255,180,120,0.95)',
    hurt: 'rgba(255,120,140,0.95)',
    death: 'rgba(200,120,255,0.9)'
  };

  // Compute grid layout to show whole sheet using pixel-exact frames scaled to fit
  const gridPadding = 8;
  const availableW = panelW - padding * 2;
  const availableH = panelH - 120;
  // frame pixel size from clip
  const frameW = clip.frameWidth;
  const frameH = clip.frameHeight;
  // compute maximum uniform scale that fits both width and height
  const maxScaleX = Math.floor(availableW / (frameW * cols + gridPadding * (cols - 1)) * 100) / 100 || 1;
  const maxScaleY = Math.floor(availableH / (frameH * rows + gridPadding * (rows - 1)) * 100) / 100 || 1;
  const scale = Math.max(0.2, Math.min(maxScaleX, maxScaleY));
  const cellW = Math.floor(frameW * scale);
  const cellH = Math.floor(frameH * scale);
  const gridW = cols * cellW + Math.max(0, cols - 1) * gridPadding;
  const gridH = rows * cellH + Math.max(0, rows - 1) * gridPadding;
  const gridX = px + (panelW - gridW) / 2;
  const gridY = py + 64;
  // debug seam overlay removed

  // Draw prompt area - if in flow, prompt which state to select
  ctx.font = `14px ${UI_FONT_FAMILY}`;
  ctx.fillStyle = '#9edcff';
  if (devInspectorFlowActive) {
    devInspectorSelectedState = stateList[devInspectorCurrentStateIndex] || stateList[0] || null;
    ctx.fillText(`Pick frames for: ${(devInspectorSelectedState || 'walk').toUpperCase()}  —  Click cells to toggle. Press Enter when done.`, px + padding, py + 52);
  } else {
    ctx.fillText('Pick frames: click cells to toggle frames for any state. Use Enter to cycle keys.', px + padding, py + 52);
  }

  // Draw grid cells representing the sheet
  ctx.save();
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const ix = gridX + c * (cellW + gridPadding);
      const iy = gridY + r * (cellH + gridPadding);
      // source coordinates in image
      const sx = c * clip.frameWidth;
      const sy = r * clip.frameHeight;
      ctx.save();
      ctx.beginPath();
      ctx.rect(ix, iy, cellW, cellH);
      ctx.clip();
      ctx.drawImage(clip.image, sx, sy, clip.frameWidth, clip.frameHeight, ix, iy, cellW, cellH);
      ctx.restore();

      // highlight selection for states that include this frame
      const globalIndex = r * cols + c;
  // if any state has this globalIndex selected, draw a small colored corner
  const keyOverrides = devInspectorOverrides[key] || {};
      let stacked = 0;
  for (const st of stateList) {
        const frames = keyOverrides[st]?.frames || [];
        if (frames.indexOf(globalIndex) !== -1) {
          // draw a small colored rounded corner indicating this state selected this cell
          ctx.save();
          ctx.fillStyle = colorMap[st] || 'rgba(255,255,255,0.9)';
          const pad = 6 + stacked * 6;
          ctx.globalAlpha = 0.95;
          ctx.beginPath();
          ctx.moveTo(ix + pad, iy);
          ctx.lineTo(ix + pad + 18, iy);
          ctx.lineTo(ix, iy + pad + 18);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          stacked += 1;
        }
      }

      // draw cell border
      ctx.strokeStyle = 'rgba(200,220,255,0.14)';
      ctx.lineWidth = 1;
      ctx.strokeRect(ix, iy, cellW, cellH);

  // draw small index for debugging (1-based)
  ctx.save();
  ctx.font = `12px ${UI_FONT_FAMILY}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(ix + cellW - 28, iy + cellH - 18, 26, 16);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(String(r * cols + c + 1), ix + cellW - 6, iy + cellH - 4);
  ctx.restore();
    }
  }
  ctx.restore();

  // Draw highlight for last click (short-lived)
  if (lastInspectorClick && lastInspectorClick.key === key) {
    const age = (performance.now() - (lastInspectorClick.time || 0)) / 1000;
    if (age < 1.2) {
      const c = lastInspectorClick.col;
      const r = lastInspectorClick.row;
      const ix = gridX + c * (cellW + gridPadding) - 4;
      const iy = gridY + r * (cellH + gridPadding) - 4;
      const iw = cellW + 8;
      const ih = cellH + 8;
      ctx.save();
      const pulse = 0.5 + 0.5 * Math.sin(age * 8);
      ctx.strokeStyle = `rgba(80,220,120,${0.9 * (1 - age)})`;
      ctx.lineWidth = 3 + pulse * 2;
      ctx.strokeRect(ix, iy, iw, ih);
      ctx.restore();

      // small status label
      ctx.save();
      ctx.font = `13px ${UI_FONT_FAMILY}`;
      ctx.fillStyle = '#bfffd8';
      const label = `Clicked: #${lastInspectorClick.globalIndex + 1} (c${c} r${r})`;
      ctx.fillText(label, gridX + 8, gridY - 6);
      ctx.restore();
    }
  }

  // Draw legend for states and current selections
  // Draw animation previews for each state (bottom area)
  try {
    const previewH = 56; // height of thumbnail strip
    const previewY = py + panelH - previewH - 56; // leave room for legend below
    const previewX = px + padding;
    const gap = 18;
    let sx = previewX;
    ctx.font = `12px ${UI_FONT_FAMILY}`;
    for (const st of stateList) {
      const clipState = clips[st];
      // background box for this state's preview
      const boxW = Math.min(520, panelW - padding * 2 - (stateList.length - 1) * gap) / Math.max(1, stateList.length);
      ctx.save();
      // highlight if this is the currently selected state
      if ((devInspectorSelectedState || stateList[0]) === st) {
        ctx.fillStyle = 'rgba(100,255,160,0.08)';
        ctx.fillRect(sx - 6, previewY - 6, boxW + 12, previewH + 28);
        ctx.strokeStyle = 'rgba(100,255,160,0.28)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(sx - 6, previewY - 6, boxW + 12, previewH + 28);
      }
      // label
      ctx.fillStyle = '#9edcff';
      ctx.fillText(st.toUpperCase(), sx, previewY - 12);
      // draw an animated thumbnail for this state
      try {
        // prefer the clip for this state, fallback to idle
        const useClip = clipState || clips.idle || clip;
        const frames = useClip ? getFramesForClip(useClip) : [];
        const total = frames.length || (useClip?.frameCount || 0);
        const overridesForKey = devInspectorOverrides[key] || {};
        const overrideFrames = (overridesForKey[st] && Array.isArray(overridesForKey[st].frames) && overridesForKey[st].frames.length) ? overridesForKey[st].frames : null;
        let thumbCanvas = null;
        const maxThumbH = previewH;
        if (overrideFrames && overrideFrames.length && frames.length) {
          // cycle through the selected frames (using their global indices)
          const rate = (useClip && useClip.frameRate) ? useClip.frameRate : 6;
          const t = devInspectorTimer || 0;
          const idxInSeq = Math.floor(t * rate) % overrideFrames.length;
          const globalIndex = overrideFrames[idxInSeq];
          thumbCanvas = frames[globalIndex % frames.length];
        } else if (frames.length) {
          // default: cycle through clip frames
          const rate = (useClip && useClip.frameRate) ? useClip.frameRate : 6;
          const t = devInspectorTimer || 0;
          let idx = Math.floor(t * rate);
          if (useClip && useClip.loop && frames.length > 0) idx = idx % frames.length;
          else idx = Math.min(idx, frames.length - 1);
          thumbCanvas = frames[idx];
        }
        if (thumbCanvas) {
          const scale = Math.min(1, maxThumbH / Math.max(1, thumbCanvas.height));
          const tw = Math.floor(thumbCanvas.width * scale);
          const th = Math.floor(thumbCanvas.height * scale);
          ctx.drawImage(thumbCanvas, 0, 0, thumbCanvas.width, thumbCanvas.height, sx, previewY + Math.floor((previewH - th) / 2), tw, th);
        } else {
          // placeholder box
          ctx.fillStyle = 'rgba(255,255,255,0.02)';
          ctx.fillRect(sx, previewY, Math.min(boxW - 8, 72), previewH);
          ctx.fillStyle = '#9edcff';
          ctx.fillText('No frames', sx + 6, previewY + previewH / 2 + 4);
        }
      } catch (e) {
        // ignore per-state drawing errors
      }
      ctx.restore();
      sx += boxW + gap;
    }
  } catch (e) {}

  const legendX = px + padding;
  const legendY = py + panelH - 40;
  ctx.font = `13px ${UI_FONT_FAMILY}`;
  let lx = legendX;
  for (const st of stateList) {
    const col = colorMap[st] || '#fff';
    ctx.fillStyle = col;
    ctx.fillRect(lx, legendY - 12, 18, 12);
    ctx.fillStyle = '#eaf8ff';
    ctx.fillText(st.toUpperCase(), lx + 22, legendY - 2);
    lx += 120;
  }

  ctx.restore();
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
          color: "#ff9b9b",
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
  endVisitorSession({ reason: "reset" });
  resetCongregationSize();
  enemies.splice(0, enemies.length);
  projectiles.splice(0, projectiles.length);
  animals.splice(0, animals.length);
  utilityPowerUps.splice(0, utilityPowerUps.length);
  clearKeyPickups();
  window.StatsManager?.resetStats?.();
  playerKeyCount = 0;
  Spawner.resetAllFlags();
  Effects.clear();
  rebuildAmbientDecor();
  bossHazards.splice(0, bossHazards.length);
  activeBoss = null;
  keyRushState.active = false;
  keyRushState.timer = 0;
  keyRushState.duration = 0;
  lastEnemyDeathPosition = null;
  cancelStartCountdown();
  needsCountdown = false;
  hpFlashTimer = 0;
  score = 0;
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
  floatingTexts.forEach((ft) => {
    if (!ft.critical) ft.life = 0;
  });
  player = createPlayerInstance(canvas.width / 2, HUD_HEIGHT + 80, assets.player);
  player.health = player.maxHealth;
  heroLives = 3;
  resetCozyNpcs(5);
  clearCongregationMembers();
  spawnWeaponDrops();
  heroRescueCooldown = 0;
  levelAnnouncements.length = 0;
  levelManager = Levels.createLevelManager();
  levelManager.begin();
  titleScreenActive = true;
  paused = true;
  gameStarted = false;
}

function gameLoop(timestamp) {
  const delta = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  updateGame(delta);
  Renderer.drawFrame();
  keysJustPressed.clear();

  requestAnimationFrame(gameLoop);
}

// Apply any saved manual grid overrides by reloading matching enemy clips
async function applySavedManualGrids() {
  try {
    if (!devManualGridOverrides || !Object.keys(devManualGridOverrides).length) return;
    const keys = Object.keys(ASSET_MANIFEST.enemies || {});
    for (const k of keys) {
      try {
        // check the manifest entry to find its source basename
        const idleDef = ASSET_MANIFEST.enemies[k]?.idle;
        const src = idleDef?.src || '';
        const basename = src.split('/').pop() || '';
        const nk = String(basename).trim().toLowerCase();
        if (devManualGridOverrides[nk]) {
          console.debug && console.debug('Applying saved manual grid for', k, devManualGridOverrides[nk]);
          // reload clips for this key so overrides take effect
          // eslint-disable-next-line no-await-in-loop
          await reloadEnemyClipsForKey(k);
        }
      } catch (e) {
        console.warn('applySavedManualGrids: failed for key', k, e);
      }
    }
  } catch (e) {
    console.warn('applySavedManualGrids: unexpected', e);
  }
}

async function init() {
  try {
    resetCongregationSize();
    assets = await loadAssets();
    rebuildObstacles();
    rebuildAmbientDecor();
  player = createPlayerInstance(canvas.width / 2, HUD_HEIGHT + 80, assets.player);
  player.health = player.maxHealth;
    heroLives = 3;
    playerRespawnPending = false;
    respawnTimer = 0;
    respawnIndicatorTimer = 0;
    backgroundImage = assets.background;
    spawnWeaponDrops();
    utilityPowerUps.length = 0;
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
    bossHazards.length = 0;
    activeBoss = null;
    npcsSuspended = false;
    titleScreenActive = true;
    paused = true;
    gameStarted = false;
    levelManager = Levels.createLevelManager();
    levelManager.begin();
  // attempt to load saved inspector overrides
    if (loadDevOverrides()) {
      devOverridesDirty = false;
    }
    if (devInspectorOverrides && devInspectorOverrides.player) {
      delete devInspectorOverrides.player;
      devOverridesDirty = true;
    }
    if (typeof window !== 'undefined' && window.__BATTLECHURCH_OVERRIDES) {
      mergeInspectorOverrides(window.__BATTLECHURCH_OVERRIDES);
    }
    if (typeof window !== 'undefined' && window.__BATTLECHURCH_MANUAL_GRIDS) {
      mergeManualGridOverrides(window.__BATTLECHURCH_MANUAL_GRIDS);
    }
  // apply any saved manual grid overrides so inspector reflects them immediately
  try { await applySavedManualGrids(); } catch (e) { /* ignore */ }
  // If there are saved inspector overrides (selected frames), ensure the runtime clips
  // are updated to include those frame maps so in-game animations match the preview.
  try { await applyInspectorOverrides(); } catch (e) { console.warn('init: applyInspectorOverrides failed', e); }
  // Re-apply explicit miniDemonFireThrower frameMaps after any reloads so they take effect
  try {
    if (assets?.enemies?.miniDemonFireThrower) {
      const idleMap = [0, 1, 2, 3];
      const walkMap = [8, 9, 10, 11, 12, 13];
      const clipIdle = assets.enemies.miniDemonFireThrower.idle;
      const clipWalk = assets.enemies.miniDemonFireThrower.walk;
      if (clipIdle) {
        clipIdle.frameMap = idleMap.slice();
        // make sure Animator can advance: set frameCount and a sane frameRate
        try { clipIdle.frameCount = clipIdle.frameMap.length || clipIdle.frameCount || 1; } catch (err) {}
        if (!clipIdle.frameRate || clipIdle.frameRate <= 0) clipIdle.frameRate = 6;
      }
      if (clipWalk) {
        clipWalk.frameMap = walkMap.slice();
        try { clipWalk.frameCount = clipWalk.frameMap.length || clipWalk.frameCount || 1; } catch (err) {}
        if (!clipWalk.frameRate || clipWalk.frameRate <= 0) clipWalk.frameRate = 8;
      }
      console.info && console.info('init: ensured miniDemonFireThrower frameMaps applied', { idleMap, walkMap });
    }
  } catch (e) {
    // ignore
  }
  // DEV: To manually spawn test minifolks, set `devTools.testSpawnMini = true`
  // in the console and press 'm' to spawn one, or call spawnEnemyOfType(...) directly.
    requestAnimationFrame(gameLoop);
  } catch (error) {
    console.error(error);
    ctx.save();
    ctx.fillStyle = "#0b0e16";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ff7676";
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
