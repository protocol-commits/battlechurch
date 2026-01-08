/* World decor manifest for Battlechurch */
(function setupWorldDecorModule(window) {
  if (!window) return;

  const VALLEY_OBJECTS_PATH = "assets/sprites/pixel-art-pack/Items/";

  const AMBIENT_CANDLE_COUNT = 0;
  const AMBIENT_DECOR_MARGIN = 80;
  const AMBIENT_CANDLE_FRAME_DURATION = 0.18;
  const AMBIENT_CANDLE_EFFECT_SCALE = 2.4;
  const AMBIENT_DECOR_COLLISION_PADDING = 12;

  const OBSTACLE_DEFS = {};

  const OBSTACLE_LAYOUT = [];

  window.WorldDecor = Object.freeze({
    VALLEY_OBJECTS_PATH,
    AMBIENT_CANDLE_COUNT,
    AMBIENT_DECOR_MARGIN,
    AMBIENT_CANDLE_FRAME_DURATION,
    AMBIENT_CANDLE_EFFECT_SCALE,
    AMBIENT_DECOR_COLLISION_PADDING,
    OBSTACLE_DEFS: Object.freeze(OBSTACLE_DEFS),
    OBSTACLE_LAYOUT: Object.freeze(OBSTACLE_LAYOUT),
  });
})(typeof window !== "undefined" ? window : null);
