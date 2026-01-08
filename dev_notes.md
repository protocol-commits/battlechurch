## Dev Notes Tracker

This file keeps context on the ongoing mission, the major systems we touch, and the experiments we've tried so future sessions don't restart from scratch. 123

### Project Overview
- Genre: top-down battle/sandbox hybrid with a church/congregation theme (Battlechurch). The player defends a flock of NPCs, picks up grace/power-ups, and clears months/battles/hordes while story/visitor beats play out.
- Loop: prepare via mission briefs → face hordes of enemies → trigger grace rushes/bosses → manage NPC evacuations/visitor minigames → repeat per level/month/battle hierarchy.
- Input: keyboard, pointer, and optional virtual sticks with NES-inspired button emulation for debugging (`ArrowLeft`/`ArrowRight` queue buttons and `space` toggles pause/restart).
- Visuals/UI: HUD, floating speech/status bubbles, mission brief popups, mini-boss teaser, restricted zones visualization, congregational chatter overlays, and touch controls styled in `style.css`.
- Assets: kept in `assets/` with sprite sheets referenced by modules; runtime overrides live in `overrides.js`, which also publishes `__BATTLECHURCH_ASSET_VERSION` to bust caches.

### Module Summary
- `game.js`: orchestrates the canvas, main loops, entity arrays (enemies, projectiles, weapon pick-ups, NPCs, power-ups, grace), player state, visitor sessions, grace rushes, boss fights, hero lives/respawns, congregational procession, and dev status text; defines numerous constants for spawn rates, power-up timers, and NPC behavior. TODO markers remind us to hook melee Circle visuals and restricted-zone checks into renderers.
- `renderer.js`: handles every draw: mission briefs, HUD, announcements, mini-boss previews, restricted zone highlights, congregational scenes, and dev overlays (e.g., weapon meter above player). Contains scenario lists, popup logic, warning descriptions, and instructions for contributors editing mission scripts.
- `spawner.js`: dependency-injected spawner for enemies (with caps, staggered portal spawns, skeleton packs, and mini-folk scaling), all configured through an options object (`getAssets`, `createEnemyInstance`, `spawnPuffEffect` hooks). Supports skeleton groups, portal scheduling, audio/puff spawn, and level flag resets.
- **Portal-style spawns**: the old idea to keep enemies off-screen (spawnX ≈ ±2600) ran into `clampEntityToBounds`/collision logic, which snaps them back into the arena before the `spawnOffscreenTimer` can protect them. We tried logging spawns, adding timers, and widening the clamps, but the clamp still fires too early. The current approach spawns enemies just outside the visible edges (+/−24 px) and doubles the puff radius so the portal effect masks the pop until they walk in.
- **Spawn note**: left/right hordes still pop inside the visible bounds even though `randomSpawnPosition()` yields coordinates like ±2600, because `clampEntityToBounds`/collision resolution immediately repositions a freshly spawned enemy before the `spawnOffscreenTimer` can protect it. We logged the spawn positions, added timers/`ignoreWorldBounds` guards, and widened clamp margins, but something still runs too early—future work should gate every clamp/collision path on that timer or fall back to a portal effect instead of forcing actual off-screen movement.
- `entities.js`: builds player/enemy configs, exposes `Animator`/`AnimationClip`, and provides utility math (normalization, radius calculations, movement-lock checks). Responsible for scaling enemy health, relating to global settings, and forging re-usable data for the entity factory.
- `levels.js`: progression manager that feeds months/battles/hordes with narrative text, battle announcers, timing constants (intros, clears, pauses), grace rush durations, portrait history caps, and hooks to spawn enemies/power-ups, evacuate NPCs, or trigger visitor minigames. Maintains dependency injection for score reads, hero sayings, and congregation resets.
- `input.js`: registers keyboard, mouse, pointer, and virtual stick listeners; tracks pointer/canvas coordinates, movement direction for melee facing, NES ‘A/B’ test toggles, inspector callbacks, and virtual joystick dead zones/pointer IDs; prevents default for navigation keys and dispatches queued prayer bombs.
- `effects.js`: maintains visual effects (impact, magic, glow, debug circles) via resolvers that fetch `ctx` and sprites; includes helper classes `Effect`, `DebugCircle`, `PrayerBombGlow`, and functions to spawn each particle type.
- `floatingText.js`: speech/status bubble orchestrator; adds damage popups, hero/NPC taunts, status updates, and auto-prunes non-critical bubbles when the cap is met; exposes hooks to set player resolver and max bubble count.
- `decor.js`: defines ambient decor constants (candle count, margins, collision padding, sprite root). Acts as a manifest for obstacle layouts and candle animations even though layout arrays are empty placeholders for now.
- `overrides.js`: houses override data for enemy animation frames (mini demons, skeletons, etc.) and publishes the current asset version stamp `2025-10-30d` so deployments bust browser caches. Keep using the dev inspector to update this JSON when animators should use custom frame ranges.
- `enemy_class_tmp.js`: temporary Enemy class that handles AI loops (target acquisition, ranged vs melee behavior, attack locks, projectile firing, shield handling, attack timers) along with debug logging; likely to be merged back into the canonical enemy factory once behaviour is stable.
- `style.css`: positions the canvas, virtual controls, HUD, mission popups, and debug helpers; ensures touch controls/joysticks stay locked to the right spots, fonts/numbers scale, and pixelated art remains crisp.

### Enemy Reference
- **Base foes (`game.js:1248-1480`)** are defined in `ENEMY_DEFINITIONS`. Each entry declares folder/scale, stats (speed, health, damage, attack range, cooldown, score) and some have specialized files for alternate animations (archers, knights, undead). Think of them in buckets: ranged archers/parish shooters (archer, skeletonArcher, wizard), brute melee bruisers (knight, armoredOrc, werewolves) whose high health triggers the Entities health‑based speed clamp so they walk slower automatically, and unusual targets like the werebear/werewolf that hurt and disrupt NPC flow.
- **MiniFolk demons (`game.js:1529-1551`)** are loaded from `assets/sprites/MinifolksDemons/…`. They wrap into `MINIFOLKS` so `spawner.js` can treat them specially; we already boost `miniDemonTormentor`, `miniHighDemon`, and `miniDemonLord` with massive health/scale adjustments (`spawner.js:133-164`) and slow them down relative to their boosted HP so they fit the “big enemy” profile.
- **Health vs walk speed** is normalized in `entities.js:82-119`: `buildEnemyTypes` scales each enemy’s stored `speed` by comparing its (scaled) hit radius/health against a reference so bulkier/tougher enemies are forced to move slower, staying consistent even if the config file grows.

### Outstanding Notes / TODOs
- `game.js` still needs to inform `renderer.js` when the melee attack circle should disappear once `meleeAttackState.fade` hits zero (call to hide visual is TODO). Look for `window._meleeAttackState` near the top of the file.
- Restricted zones are defined in `renderer.js`, but player/enemy/power-up code currently lacks enforcement; plan to check `isInRestrictedZone` before moving/spawning to avoid weird overlaps.
- Mission Brief logic relies on `missionBriefScenarios` (renderer) and a `stage === 'briefing'` flag; confirm the `levels.js` flow sets that stage before each month so the popup renders once.
- Visitor session tracking uses sets for chatty visitors and locking blockers plus auto-triggered minigames; when adjusting boss or NPC logic, make sure `visitorSession` flags (like `movementLock`, `quietedBlockers`) stay consistent.
- Power-up respawn and grace rush durations are encoded in `game.js` constants; any balancing tweaks should update both gameplay logic and HUD rendering in `renderer.js`.
- `spawner.js` depends on injected callbacks (`createEnemyInstance`, `spawnPuffEffect`), so aligning `enemy_class_tmp.js` with those hooks is next when consolidating enemy creation.
- Input inspector hooks (`onInspectorClick`, `shouldHandleInspectorClick`, `onAnyKeyDown`) remain stubbed; hook them to dev tools or debugging overlays only when needed to avoid disrupting gameplay on release builds.

### Weapon Power-Ups
- Scripture, Wisdom, and Faith power-ups grant temporary weapon multipliers by setting `player.weaponPowerTimer`/`player.weaponPowerDuration` (default 8s in `game.js`). The HUD in `renderer.js` shows a meter above the hero that should pause while Sword/Faith Rush/Divine Shot animations lock input.
- These power-ups spawn as weapon pick-ups, so `canSpawnWeaponPowerUp()` and the `weaponPickups` array in `game.js` must honor `powerUpRespawnTimer` before allowing another active effect.
- Weapon boosts increase DPS, add projectile effects, or modify auto-fire behavior depending on the picked-up power-up definition.

### Item Power-Ups
- Utility power-ups (heal, shield, faith boosts) are singleton spawns: `canSpawnUtilityPowerUp()` ensures only one is live, and they rely on timers such as `POWERUP_ACTIVE_LIFETIME`, `POWERUP_BLINK_DURATION`, and `POWERUP_RESPAWN_DELAY`.
- Grace behaves like items with attraction/physics constants (`GRACE_PICKUP_ATTRACT_DISTANCE`, `GRACE_PICKUP_GRAVITY`, etc.) and is used for upgrades post-battle; HUD should indicate remaining grace pickups before they disappear.
- Other collectible items include visitor hearts and mission-specific buffs; align spawn logic with `utilityPowerUps`, `weaponPickups`, and `gracePickups` arrays to avoid overlapping restricted areas.

### NPC System (The Flock)
- Every battle begins with five NPCs stored in the `npcs` array; they fire projectiles to support the player and act as living weapon upgrades.
- NPCs have Faith Meters that drain when Temptation Demons attack; hitting zero triggers a walk toward the fog, causing loss of congregation score.
- Killing enemies restores faith to surviving NPCs, plus Emotional Intelligence stat upgrades increase NPC fire rate, accuracy, and recovery speed while shortening Visitor Hour distractions.
- Losing an NPC reduces firepower and is reflected on post-battle tally screens (bright portraits + halos for survivors, dimmed for losses with name tags like “Helen T.” or “John F.”) along with reflection text (“You helped these people…” vs “These members were lost…”).

### Feature Bible
- **Narrative Framework**
  - Premise: Last pastor of the final church in a dying town; each battle is a spiritual struggle for the congregation.
  - Intro Sequence: Start in the sanctuary with 50 NPCs, move/shoot to learn controls, then press Space to begin.
  - Battle Prep: Show popup describing the emotional struggle of the five NPCs fighting that battle.
  - Post-Battle Tally: Display portraits with halos for survivors, dim/faded for losses; include reflection text emphasizing who was saved vs. lost.
- **Game Structure**
  - One-year arc containing Spring, Summer, Fall, Winter (4 levels).
  - Each level has 3 months, each month has 3 battles, each battle consists of 6 waves (hordes).
  - After Month 3 → Seasonal boss fight; after Battle 2 each month → Visitor Hour mini-game; after every battle → stat upgrade screen.
- **Controls**
  - Movement: Joystick or WASD; mobile uses hybrid fixed joystick bottom-left.
  - Action Button (A): Input priority Hold (Divine Shot) > Double Tap (Faith Rush) > Tap (Sword of the Spirit). Auto-fire pauses during special animations.
    * Sword of the Spirit: single tap melee strike, high damage small radius, short animation lock.
    * Faith Rush: double tap dash with ~0.3s invulnerability and no cooldown.
    * Divine Shot: hold+release charged projectile (0.5s charge) that fires a piercing beam in current movement direction.
  - Prayer Bomb (Divine Intervention): separate button tied to Faith Meter levels (Level 1–3) applying sweeping or cinematic effects on bosses without outright killing them.
- **Combat Systems**
  - Auto-fire always targets the nearest enemy but pauses during special action animations.
  - Prayer Bomb has three tiers, culminating in an angelic intervention for Level 3.
- **Enemy System**
  - Standard demons pursue the player.
  - Temptation Demons nudge NPCs toward the fog and drain their faith.
  - Bosses appear after each season.
- **Environment & Fog**
  - Fog overlays define the play area on the left, right, and bottom edges, render above entities, and animate with fade masks.
  - Enemies spawn from fog edges; NPCs lost to faith drain disappear beneath the fog.
- **Visitor Hour**
  - Triggered after Battle 2 of each month.
  - Player collects visitor NPCs while chatty NPCs block movement; Emotional Intelligence stat reduces distraction duration.
  - Visitor Hour is the only time congregation score increases.
- **Progression & Upgrades**
  - Grace earned during battles rolls over and is spent on stat upgrades after each battle (Sword of the Spirit, Shield of Faith, Shoes of Peace, Heart of Compassion).
  - Stats feed into NPC firepower, Faith Meter resilience, and prayer bomb potency.
- **Scoring**
  - Score equals remaining congregation size; decreases when NPCs are lost and increases only during Visitor Hour.
  - Final score is congregation count after the fourth boss.
- **Implementation Priorities**
  1. Narrative/UI: story popups, tally screens, reflection lines.
  2. Combat: Divine Shot charge attack, polished Sword/Rush animations, reliable tap/double-tap detection.
  3. NPC mechanics: faith regen from kills, separation behavior, faith drain cues.
  4. Fog system: overlays, fade masks, animation, rendering above entities.
  5. Visitor Hour: visitor/chatty AI, Emotional Intelligence adjustments, scoring.
  6. Progression: upgrade screen, key rollover, persistent stats.
  7. Audio/Visual cues for NPC loss/survival.

### Work Log
- (1) 2024-11-02 Initial tracker file added to capture context so future sessions won't reset.
- (2) 2024-11-02 Expanded tracker with module summaries, TODO list, and reminder protocol; filled in what each major file currently handles based on today's review.
- (3) 2024-11-02 Added weapon/item power-up explanations, NPC system summary, and a comprehensive feature/narrative bible per the latest design brief; no game files were modified per request.
- (4) 2024-11-03 Implemented melee weapon knockback for enemies that survive the A-button hit so they’re pushed back slightly; this keeps the knife swing from pinning foes in place (`game.js` update).
- (5) 2024-11-03 Introduced a larger pushback-only radius around the A-button melee (no damage) so nearby enemies are shunted outward, and added a developer circle in the renderer to show that proposed range (`game.js`, `renderer.js`).
- (6) 2024-11-03 Adjusted the pushback circle so it is an extension in the facing direction (damage circle stays tucked inside, both touching on the trailing side) and updated the DevViz circle to match the directional pushback center (`game.js`, `renderer.js`).
- (7) 2024-11-03 Reduced the pushback radius to 80px to keep the shove tight; adjust `MELEE_PUSHBACK_RADIUS` in `game.js` if you want to fine-tune it further while the renderer’s dev circle follows that value automatically.
- (8) 2024-11-03 Added a cooldown (0.35s) to the A-button attack plus a short damage window (0.25s) so the developer circle only appears for that span; both the damage/pushback logic and the HUD circle read `MELEE_DAMAGE_DURATION`/`MELEE_COOLDOWN` near the melee section of `game.js`.
- (9) 2024-11-03 Increased the melee cooldown to 0.55s so the A-button can’t be spammed; tweak `MELEE_COOLDOWN` in the same block near `game.js:8018-8036` to adjust timing.
- (10) 2024-11-03 Extended the A-button behavior: single taps still trigger the melee slice, double taps now rush the player forward (~150px) and drop dust along the dash (spawned via `spawnImpactDustEffect`), and holding the button for ~3s fires a charged Divine Shot projectile; all the relevant tuning constants (`MELEE_DOUBLE_TAP_WINDOW`, `RUSH_DISTANCE`, `MELEE_HOLD_CHARGE_TIME`, etc.) live near the melee block so you can tweak tap windows, rush speed/damage, divine shot stats, and the new 3s `RUSH_COOLDOWN` together. (Scoreboard now refers to the upper-right HUD grid.)
- (11) 2024-11-03 Updated the charge flow: it now takes 2s, emits a pulsing yellow halo around the hero during the hold, spawns the existing `flash` effect when the charge window finishes, turns the melee circle into a blinking white indicator to highlight the ready state before release, and fires a Scripture-style beam that pierces everything across the screen when released.
- (13) 2024-11-03 Added temporary invulnerability while rushing and for 0.25s afterwards to give the dash a cinematic, protective feel, and rendered a directional shield arc in front of the hero while rushing to show the coverage; the arc is now just the outer circumference facing the rush direction so it reads more like a partial shield instead of a filled wedge.
- (14) 2024-11-03 Redesigned the upper-right scoreboard as a tight icon-and-count grid: the torch/NPC icon shows congregation size, the flag animation (fallback to the red X) marks NPCs lost, and the animated key icon sits next to the key tally—no textual labels, icon-and-number columns stay compact, and the scoreboard counts are kept flush with the left HUD styling.
- (15) 2024-11-04 Camera shake now caches its offset each frame so HUD drawing reuses the same translation that `drawGame` applied, and the renderer resets the canvas transform before each world draw so any stray jiggle can’t permanently shift the view—this keeps HUD/scene alignment steady once the camera jiggle ends.
- (16) 2024-11-04 Added a persistent stat-upgrade layer: `stats_manager.js` tracks five stats (melee, projectile, resistance, speed, emotional intelligence) with 10% base bumps and a 50×1.1 scaling cost per purchase, `upgrade_screen.js` renders a modal after every battle summary so players can spend grace, and `game.js`/`entities.js` now read those values for damage, resistance, movement, and enemy projectile power.
- (17) 2024-11-04 Tightened the A-button double-tap window to 0.18s so the rush happens only when the player quickly taps the melee button twice (classic double-tap timing), keeping the normal single-melee path responsive.
- (18) 2024-11-04 Grace drops now scale with enemy size: larger foes are more likely to spill grace and can drop extra stacks on top of the normal random count, so tankier enemies reward the player with more currency.
- (19) 2024-11-04 Upgrade pause now clears lingering pickups/power-ups/effects before the modal appears so the visitor mini-game isn’t buried under leftover key sprites after a boss or big wave.
- (20) 2024-11-04 Added a shared dialog overlay (swatch-driven blur box + continue button) and now the title screen uses it so the first “Press Space to continue” panel is rendered in DOM instead of canvas; tested with the new controller before rolling out to the other screens.
- (21) 2024-11-04 How-to-play now reuses the same dialog overlay with descriptive text; clicking or hitting Space runs the existing briefing start logic, so the overlay is the single “Press Space to continue” surface for both title and tutorial screens (the canvas-based text is now suppressed whenever the overlay is visible).
- (22) 2024-11-04 Mission briefs now surface inside the swatched dialog overlay (text+button only once per month); the canvas draw is suppressed while the overlay is visible, and the brief waits until the upgrade overlay finishes so it no longer appears on top of the previous battle’s summary.
- (23) 2024-11-04 The game pause screen now uses the same swatched dialog overlay: pressing pause shows the modal, and pressing Continue/Space resumes the game (clearing the overlay, resetting `paused`, and marking the session as started) while `renderer.js` skips its old canvas panel whenever the overlay is active.
- (24) 2024-11-04 Battle summaries now also appear inside the dialog overlay (summary variant) and the saved/lost NPC portraits are rendered inside a canvas in the DOM so they’re visible in the modal; after Continue the announcement dismisses, lingering pickups/power-ups are cleared, and the upgrade modal follows as before—the Space press no longer toggles pause while the overlay is still active. The summary now defers showing the upgrade modal until the overlay is hidden and automatically triggers the upgrade dialog afterward.
- (25) 2024-11-04 Mission summaries and upgrades now pause the arena entirely: when any dialog overlay is visible we stop updating/drawing the game state, draw a blank screen, and now the overlay uses a very light black tint (`rgba(4,7,14,0.1)`) so the battlefield barely shows through while the DOM box remains legible. Added a guard to clear the space key when any modal is active so the pause toggle doesn’t fire immediately after the summary overlay consumes the space press.
- (26) 2024-11-04 Both the battle summary and upgrade overlays now declare when they consumed the Space key, which the game loop checks before allowing pause toggles—pressing Space on the upgrade screen will only close it (and then immediately open the upgrade/next dialog) instead of pausing. Added a helper that explicitly clears the pause/restart actions so residual Space presses can’t trigger pause after the modal closes, and the overlays keep that consumed flag alive long enough for the main loop to read it.
- (27) 2024-11-05 Player deaths now trigger a mini-cinematic: after the hero dies with no lives left the scene stays frozen in the final death frame for 5 seconds (enemies wander freely), then three mini-imp swarms pour into the arena while a second-long fade-to-black ramps up, and only once the fade finishes does `gameOver` flip on — at that point we open a DOM “Game Over” dialog (buy-in text + Restart action) instead of drawing the in-canvas banner so the narrative copy always appears once the fade completes.
- (28) 2024-11-05 Respawns now drop the pastor at the top-center of the battlefield with full health so each life truly starts fresh; the death animation still plays when HP reaches 0, and the DOM game over dialog stays mid-screen while the demons roam behind.
- (29) 2024-11-05 Emotional Intelligence upgrades now also push NPC projectile damage, scale, and fire rate up by 10% per stat level so every boost strengthens their friendly arrows (`game.js`, `stats_manager.js`), keeping the support layer consistent.
- (30) 2024-11-05 Added a developer hotkey (`K`) that instantly grants 500 grace and surfaces the status via `setDevStatus`, easing progression testing scenarios (`game.js`).
- (31) 2024-11-05 Restored the NPC “Harmony” harp power-up so it now grants a global 50% boost to NPC damage, fire rate, and projectile scale for the buff duration, while still keeping the stat-driven upgrades as the baseline (`game.js`, `powerup_definitions.js`).
- (32) 2024-11-05 Melee charge now fires after 1.5s of holding the attack button instead of 2.0s, keeping the rush/Divine Shot timing tighter (`game.js`).
- (33) 2024-11-05 Divine Shot now retains the player’s facing direction but auto-assisted itself toward the nearest enemy in that cone, leveraging a temporary homing window for smoother targeting (`game.js`).
- (34) 2024-11-05 Divine Shot projectiles gain a priority flag so they dominate every other enemy shot (with the collision loop adjusting by priority), yet the system is ready for future boss projectiles to raise their own priority and beat the Divine Shot when needed (`game.js`, `projectile_config.js`).
- (35) 2024-11-05 The glowing charge circle now disappears as soon as Divine Shot hits full charge instead of persisting until release, matching the request to stop the buildup effect once it’s ready (`renderer.js`).
- (36) 2024-11-05 Simplified the melee button so A now only powers the Rush or Divine Shot flows—no standalone tap attack—while clearing the charge visual any time the button goes up before the charge completes (`game.js`).

### Updating Protocol
1. Before touching a major subsystem, log the goal(s) and target files so future sessions understand why the change happened.
2. After edits, append what was tried, what passed/failed, and whether follow-ups are needed (even small follow-ups like “need to rerun mission brief test”).
3. Keep entries terse but informative; use dates or small session tags and avoid rewriting past entries unless correcting a factual error.

Future Codex instances should update this file whenever the focus shifts so the next wake-up has ready context.

### Known Issues
- Final defeat still leaves the red/white damage flash overlay at peak opacity even though the game-over state is active, so the hero's corpse looks washed out. Tried gating the renderer by `postDeathSequenceActive`, `gameOver`, and `heroLives`, and zeroed the `damageHitFlash` timer at multiple transition points, but the overlay still pulses on the last life. Need to revisit how the HUD draws the flash during the game-over fade.

### Future Fixes
- Re-evaluate how the damage flash overlay is triggered and faded in `renderer.js` so it respects any death cinematics without relying on multiple guards scattered across the game loop.
- (16) 2025-11-06 Wisdom weapon now fires `fireball9.png`–`fireball18.png` from `assets/sprites/magic-pack/sprites/fireball/sprites/` and its hit spark comes from `assets/sprites/magic-pack/sprites/flash/sprites/flash#.png`; both loaders are annotated inline in `game.js` so projectile/impact mappings are easy to locate.
- ### Weapon Notes
- Wisdom weapon uses projectile frames `fireball9.png`-`fireball18.png` from `assets/sprites/magic-pack/sprites/fireball/sprites/`, hits spawn the `flash1-14` sprites from `assets/sprites/magic-pack/sprites/flash/sprites/`, and the glow uses `drawProjectileGlow` so it matches other friendly shots; the loader comments in `game.js` pair the projectile and impact animations.
- Faith/fire projectiles triggered by the torch (`WEAPON_DROP_DEFS.faith`) are now labeled as the canonical 'cannonWeapon' and re-use the same flash spark on enemy impact, so all friendly hits are documented in the same section.
- Faith shots (heart projectiles) now share the same `flash` spark so their hits match the wisdom animation; both the projectile loop and the `detonateMagicProjectile` hit handler log the flash file path in the nearby comments.
- (17) 2025-11-06 The flash sprite (`flash1-14`) now drives both the wisdom impact (`magicImpact`), the splash (`magicSplash`), and heart/projectile hit sparks, so all friendly hits share the same flash animation instead of the older puff/vfx-d sheets.
- (18) 2025-11-07 Faith/cannon projectiles from the torch (pig shots) now use the same flash1-14 impact animation we established for wisdom/hearts, so the flash file path is documented both in the collision handler and the loader comments for quick lookup.

- (24) 2025-11-15 Started migrating the mission brief scenario list out of renderer.js to keep drawing logic lighter and make the scenario bank easier to maintain.
  - Goal: Add a new mission_brief_data.js that exposes the scenarios, update renderer.js to read from it, and add the script tag to index.html.
  - Follow-up: Confirm mission brief popups still select a scenario before each month.
- (25) 2025-11-15 Adjusted the damage-flash guard so it only renders when the hero entity exists and isn’t already dead; this keeps the overlay from lingering on the final game-over frame.
- (26) 2025-11-15 Pulled the Visitor blocker line bank out of `game.js` into `visitor_blocker_lines.js` so the core loop only references the shared list instead of owning the text data.
  - Goal: Expose `BattlechurchVisitorBlocker.blockerLines` and wire it into `game.js`/`index.html`.
- (27) 2025-11-15 Migrated the NPC variant lists (hair, clothing, accessories) into `npc_variants.js` so the NPC asset loader just consumes the shared arrays instead of owning the copy data.
  - Goal: Publish `BattlechurchNpcVariants` and reference it from `game.js` during asset loading.
- (28) 2025-11-15 Pulled the NPC struggle/return dialogue banks into `npc_dialogue_lines.js` so future tweaks live in a dedicated module instead of the top of `game.js`.
  - Goal: Publish `BattlechurchNpcDialogue.struggleLines`/`returnLines` and reference them when the NPC dialogue routines need them.
- (29) 2025-11-15 Extracted the large `ENEMY_DEFINITIONS` catalog into `enemy_definitions.js` so the gameplay loop can stay slimmer and the enemy stats live in a dedicated data module.
  - Goal: Publish `BattlechurchEnemyDefinitions` for shared consumption and read it from `game.js` before the rest of the level logic runs.
- (30) 2025-11-15 Pulled the `MINIFOLKS` manifest into `mini_folk_definitions.js` so the gameplay loop doesn’t need to carry the entire mini-fo list inline.
  - Goal: Publish `BattlechurchMiniFolks.list` and reference it from `game.js` wherever the mini enemies are needed.
- (31) 2025-11-15 Moved `WEAPON_DROP_DEFS` and `UTILITY_POWERUP_DEFS` into `powerup_definitions.js` so the gameplay loop no longer owns the asset path literals.
  - Goal: Publish `BattlechurchPowerupDefinitions.weaponDropDefs`/`utilityPowerupDefs` and reference them from `game.js`.
- (32) 2025-11-15 Extracted `PROJECTILE_CONFIG` plus the shared cooldowns into `projectile_config.js` so the projectile stats and cooldown timers live in a single data module.
  - Goal: Publish `BattlechurchProjectileConfig` (world-scale, config, pig/coin cooldowns) and have `game.js`/other systems consume it instead of redefining the object.
- (33) 2025-11-15 Pulled the asset manifest (player/projectile/enemy sprites) into `asset_manifest.js` so the sprite-path literals and enemy manifest builder live in a dedicated data helper.
  - Goal: Publish `BattlechurchAssetManifest.build(...)` and consume it before the mini-folk injection in `game.js`.
- (34) 2025-11-15 Migrated the HUD drawing logic into `hud.js` so the renderer just delegates to that helper and the HUD code can be worked on independently.
  - Goal: Push `BattlechurchHUD.draw(bindings, shakeOffset, roundRect)` into its own module and keep `renderer.js` focused on orchestrating scene layers.
- (35) 2025-11-15 Extracted dialog/prompt copy (`title`, `how-to-play`, `pause`, `game over`) into `ui_texts.js` so the UI strings can be updated without touching `game.js` directly.
  - Goal: Publish `BattlechurchUIText` and reference it in the overlay helpers and game-over dialog.

### Cleanup Backlog
- (None currently pending)
- **Scoreboard:** the upper-right board in `hud.js:221` is what we call “the scoreboard”; it now renders a tight icon-and-value grid (icons are preloaded via `scoreboardIconSources`) for Congregation/Lost/Grace/Enemies so any future HUD tweaks should start there.
