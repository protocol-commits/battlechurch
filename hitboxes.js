(function(global) {
  const HITBOXES = {
  "player": {
    "hitbox": {
      "width": 50,
      "height": 70,
      "offsetX": -8,
      "offsetY": 4
    }
  },
  "npcs": {},
  "projectiles": {}
};
  global.BattlechurchHitboxes = HITBOXES;
})(typeof window !== "undefined" ? window : globalThis);
