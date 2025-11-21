(function(global) {
  const ENEMY_CATALOG =
    (global.BattlechurchEnemyCatalog && global.BattlechurchEnemyCatalog.catalog) || {};
  const ns =
    global.BattlechurchEnemyDefinitions ||
    (global.BattlechurchEnemyDefinitions = {});
  Object.assign(ns, ENEMY_CATALOG);
})(typeof window !== "undefined" ? window : globalThis);
