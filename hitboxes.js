(function(global) {
  const HITBOXES = {
  "player": {
    "hitbox": {
      "width": 50,
      "height": 70,
      "offsetX": -8,
      "offsetY": 4
    },
    "weaponHitbox": {
      "width": 125,
      "height": 100,
      "offsetX": 55,
      "offsetY": 0
    },
    "dashSlashHitbox": {
      "width": 300,
      "height": 125,
      "offsetX": 50,
      "offsetY": 0
    },
    "rushHitbox": {
      "width": 327.59999999999997,
      "height": 173,
      "offsetX": 75,
      "offsetY": 0
    },
    "attackHitFrame": 2
  },
  "npcs": {},
  "projectiles": {}
};
  global.BattlechurchHitboxes = HITBOXES;
})(typeof window !== "undefined" ? window : globalThis);
