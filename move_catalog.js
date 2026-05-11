/**
 * move_catalog.js
 * ===============
 * Single source of truth for all player moves.
 *
 * HOW TO USE:
 * - Add a new move here when you add a new attack to game.js
 * - `key` must match the name used in MOVE_BANNER_TOKENS and registerComboMoveName()
 * - `damage` values must stay in sync with the constants in game.js (see comment next to each)
 * - `cooldown` is in seconds (null = governed by combo/charge state, not a flat cooldown)
 * - `prayerCost` is in prayer units out of 6 (null = no prayer cost)
 * - `category`: "sword" | "combo" | "prayer"
 * - `desc` is shown on the How to Play screen — one short line
 */
(function (global) {
  // DAMAGE REFERENCE (must match game.js constants):
  //   MELEE_BASE_DAMAGE            = 100
  //   MELEE_SPIN_DAMAGE_MULTIPLIER = 2   → spin = 200
  //   MELEE_SWOOSH_DAMAGE_SCALE    = 1.2 → swoosh = 120
  //   CLEAVE_DAMAGE_MULTIPLIER     = 3   → cleave = 300
  //   RUSH_DAMAGE                  = 200 (MELEE_BASE_DAMAGE * 2)
  //   DIVINE_SHOT_DAMAGE           = 100
  //   BLITZ_DAMAGE                 = 300 (RUSH_DAMAGE + DIVINE_SHOT_DAMAGE)
  //   RING_OF_FIRE_DAMAGE          = 34 per tick (boss: 18)
  //   PRAYER_BOMB_LEVEL1_DAMAGE    = 250 (boss: 1000)
  //   PRAYER_BOMB_LEVEL2_DAMAGE    = 400 (boss: 2000)
  //   PRAYER_BOMB_LEVEL3_DAMAGE    = 250 (rain, per strike)
  //   CONGREGATION_COMMAND_DAMAGE  = 30 per congregant hit

  const CATALOG = [
    // ── SWORD MOVES ─────────────────────────────────────────────────────────
    {
      key: "Slash",
      publicName: "Slash",
      input: "A",
      category: "sword",
      damage: 100,           // MELEE_BASE_DAMAGE
      cooldown: 0.4,         // MELEE_COOLDOWN
      prayerCost: null,
      desc: "Quick sword slash. Your fastest attack and backbone of every combo.",
    },
    {
      key: "Blast",
      publicName: "Blast",
      input: "Charge A",
      category: "sword",
      damage: 120,           // MELEE_BASE_DAMAGE * MELEE_SWOOSH_DAMAGE_SCALE (1.2)
      cooldown: null,
      prayerCost: null,
      desc: "Charged horizontal slash with a wide arc and brief forward lunge.",
    },
    {
      key: "Smash",
      publicName: "Smash",
      input: "B → A",
      category: "combo",
      damage: 200,           // RUSH_DAMAGE (MELEE_BASE_DAMAGE * 2)
      cooldown: 3.0,         // RUSH_COOLDOWN
      prayerCost: null,
      desc: "Dash forward then slam. Clears a path and gives brief invincibility frames.",
    },
    {
      key: "Cleave",
      publicName: "Cleave",
      input: "A + B",
      category: "combo",
      damage: 300,           // MELEE_BASE_DAMAGE * CLEAVE_DAMAGE_MULTIPLIER (3.0)
      cooldown: null,
      prayerCost: null,
      desc: "Simultaneous press delivers a powerful cleaving blow — highest raw sword damage.",
    },
    {
      key: "Thrash",
      publicName: "Thrash",
      input: "Charge B + A",
      category: "combo",
      damage: 300,           // BLITZ_DAMAGE (RUSH_DAMAGE + DIVINE_SHOT_DAMAGE)
      cooldown: null,
      prayerCost: null,
      desc: "Rush forward and fire a projectile on impact — big damage at mid range.",
    },
    {
      key: "Crash",
      publicName: "Crash",
      input: "Charge B",
      category: "sword",
      damage: null,          // knockback/dash — no direct damage value
      cooldown: 2.0,         // DASH_COOLDOWN
      prayerCost: null,
      desc: "Protected shoulder dash that breaks through enemy lines with strong knockback.",
    },
    {
      key: "Reap",
      publicName: "Reap",
      input: "C → A",
      category: "combo",
      damage: 200,           // MELEE_BASE_DAMAGE * MELEE_SPIN_DAMAGE_MULTIPLIER (2)
      cooldown: 2.0,         // MELEE_SPIN_COOLDOWN
      prayerCost: null,
      desc: "Spinning sword attack that hits all enemies around you.",
    },
    {
      key: "Clash",
      publicName: "Clash",
      input: "C → B",
      category: "combo",
      damage: null,          // holy dash — repositions, does not deal direct damage
      cooldown: null,
      prayerCost: 0.5,       // 1/12 of prayer meter per use
      desc: "Quick prayer-powered dash that teleports through enemies.",
    },
    {
      key: "Flash",
      publicName: "Flash",
      input: "Charge B + C",
      category: "combo",
      damage: null,          // teleport — repositions behind target
      cooldown: null,
      prayerCost: 1,         // 1/6 of prayer meter
      desc: "Teleport behind a nearby enemy for a positional reset.",
    },
    {
      key: "Hedge",
      publicName: "Hedge",
      input: "Charge A + C",
      category: "combo",
      damage: 34,            // RING_OF_FIRE_DAMAGE per tick (boss: 18)
      cooldown: null,
      prayerCost: 2,         // 1/3 of prayer meter
      desc: "Summon a ring of holy fire that deals sustained damage to all nearby enemies.",
    },

    // ── PRAYER MOVES ────────────────────────────────────────────────────────
    {
      key: "Unity Strike",
      publicName: "Unity Strike",
      input: "C",
      category: "prayer",
      damage: 30,            // CONGREGATION_COMMAND_DAMAGE per congregant hit
      cooldown: null,
      prayerCost: null,      // charges over time; costs congregation command charge
      desc: "Command your congregation to charge nearby enemies. Double-tap to clear a path.",
    },
    {
      key: "Pastor Protect",
      publicName: "Pastor Protect",
      input: "C → C",
      category: "prayer",
      damage: null,
      cooldown: null,
      prayerCost: null,
      desc: "Order the congregation to bodyguard you — they intercept enemies near the pastor.",
    },
    {
      key: "Purge",
      publicName: "Purge",
      input: "Charge C (2 prayers)",
      category: "prayer",
      damage: 250,           // PRAYER_BOMB_LEVEL1_DAMAGE (boss: 1000)
      cooldown: null,
      prayerCost: 2,
      desc: "Targeted prayer blast. Spends 2 prayers for a focused hit. Good for elites.",
    },
    {
      key: "Smite Bomb",
      publicName: "Smite Bomb",
      input: "Charge C (full meter)",
      category: "prayer",
      damage: 400,           // PRAYER_BOMB_LEVEL2_DAMAGE at full charge (boss: 2000)
      cooldown: null,
      prayerCost: 6,         // full meter
      desc: "Expend all 6 prayers for a massive explosion. Big congregation bonus on kill.",
    },
  ];

  // Fast lookup by key
  const BY_KEY = Object.create(null);
  CATALOG.forEach((m) => { BY_KEY[m.key] = m; });

  global.BattlechurchMoveCatalog = Object.freeze({
    catalog: CATALOG,
    byKey: BY_KEY,

    /** Returns all moves in a given category. */
    byCategory(cat) {
      return CATALOG.filter((m) => m.category === cat);
    },

    /** Returns the display damage string for a move (e.g. "200" or "34/tick" or "—"). */
    damageLabel(key) {
      const m = BY_KEY[key];
      if (!m) return "—";
      if (m.damage === null) return "—";
      if (key === "Hedge") return `${m.damage}/tick`;
      if (key === "Unity Strike") return `${m.damage}/hit`;
      return String(m.damage);
    },
  });
})(window);
