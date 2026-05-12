(function(global) {
  const HITBOXES = {
  "player": {
    "hitbox": {
      "width": 24,
      "height": 33,
      "offsetX": -8,
      "offsetY": 4
    },
    "weaponHitbox": {
      "width": 250,
      "height": 100,
      "offsetX": 97,
      "offsetY": 0
    },
    "dashSlashHitbox": {
      "width": 300,
      "height": 125,
      "offsetX": 50,
      "offsetY": 0
    },
    "rushHitbox": {
      "width": 277,
      "height": 173,
      "offsetX": 42,
      "offsetY": 0
    },
    "attackHitFrame": 2
  },
  "npcs": {},
  "projectiles": {}
};
  global.BattlechurchHitboxes = HITBOXES;
})(typeof window !== "undefined" ? window : globalThis);
