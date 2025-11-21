# Battlechurch Shared Data Modules

This repository now keeps every large, reusable data table in its own module. Each module publishes a `Battlechurch*` global so the runtime can keep reading the data without duplicating it in `game.js`. Update the relevant module whenever you need to tweak the associated data:

| Module | Export | Purpose | References |
| --- | --- | --- | --- |
| `mission_brief_data.js` | `BattlechurchMissionBrief.scenarios` | Mission brief scenario list shown before a month’s first battle. | `renderer.js` mission brief popup |
| `visitor_blocker_lines.js` | `BattlechurchVisitorBlocker.blockerLines` | Speech/snark lines for Visitor blockers during visitor hours. | `game.js` Visitor session logic |
| `npc_variants.js` | `BattlechurchNpcVariants` | Hair, clothing, accessory variant lists used when loading NPC sprites. | `game.js` NPC loader |
| `npc_dialogue_lines.js` | `BattlechurchNpcDialogue.struggleLines` / `returnLines` | NPC dialogue banks shown during faith transitions. | `game.js` Visitor/NPC updates |
| `enemy_definitions.js` | `BattlechurchEnemyDefinitions` | Base enemy stats/spawn data consumed by the Entities module. | `game.js` enemy manifest & `entities.js` |
| `mini_folk_definitions.js` | `BattlechurchMiniFolks.list` | Mini-folk (mini demons/undead) asset list. | `game.js` mini-folk spawn helpers |
| `powerup_definitions.js` | `BattlechurchPowerupDefinitions` | Utility/weapon power-up asset and timing definitions. | `game.js` power-up spawns |
| `projectile_config.js` | `BattlechurchProjectileConfig` | Projectile speeds/damage, cooldown overrides, and shared paths. | `game.js`, `entities.js`, `effects.js` |
| `asset_manifest.js` | `BattlechurchAssetManifest.build` | Helper that composes the player/projectile/enemy asset manifest. | `game.js` asset loading |
| `hud.js` | `BattlechurchHUD.draw` | HUD drawing helper that renders HP, prayer meter, and score board. | `renderer.js` draw path |
| `level_data.js` | `BattlechurchLevelData` | Level narrative tables (horde pools, mission lines, boss themes). | `levels.js` progression |
| `ui_texts.js` | `BattlechurchUIText` | Dialog copy for title/how-to/pause/game over screens. | `game.js` dialogs |

Keep this file updated whenever you add or remove a `Battlechurch*` module so future contributors know exactly which file owns each shared resource.
