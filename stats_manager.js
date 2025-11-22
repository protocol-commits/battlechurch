(function (window) {
  if (!window) return;

  const BASE_COST = 25;
  const COST_SCALE = 1.1;
  const PERCENT_INCREMENT = 0.1;

  const DAMAGE_REDUCTION_DECAY = 0.85;
  const STAT_CONFIGS = {
    melee_attack_damage: {
      label: "Melee Damage",
      base: 1,
      description: "Close-range sword damage",
    },
    projectile_attack_damage: {
      label: "Projectile Damage",
      base: 1,
      description: "Ranged weapon power",
    },
    damage_resistance: {
      label: "Damage Resistance",
      base: 0,
      description: "Reduces damage taken",
      incrementValue: PERCENT_INCREMENT,
      isResistance: true,
      decayFactor: DAMAGE_REDUCTION_DECAY,
      isDecaying: true,
    },
    speed: {
      label: "Speed",
      base: 1,
      description: "Movement speed",
    },
    emotional_intelligence: {
      label: "Emotional Intelligence",
      base: 1,
      description: "Boosts NPC/Visitor projectiles",
    },
  };

  const upgradeCounts = {};
  const statKeys = Object.keys(STAT_CONFIGS);

  function resetCounts() {
    statKeys.forEach((key) => {
      upgradeCounts[key] = 0;
    });
  }

  resetCounts();

  function getStatConfig(key) {
    return STAT_CONFIGS[key];
  }

  function getIncrementValue(config) {
    if (config.incrementValue !== undefined) return config.incrementValue;
    return (config.base || 1) * PERCENT_INCREMENT;
  }

  function getStatValue(key) {
    const config = getStatConfig(key);
    if (!config) return 1;
    const count = upgradeCounts[key] || 0;
    const increment = getIncrementValue(config);
    if (config.isResistance && config.isDecaying) {
      const rawDecay = typeof config.decayFactor === "number" ? config.decayFactor : 1;
      const decay = rawDecay >= 1 ? Math.max(0.99, rawDecay) : rawDecay;
      const denominator = 1 - decay;
      const totalGain =
        count > 0 && Math.abs(denominator) > Number.EPSILON
          ? increment * (1 - Math.pow(decay, count)) / denominator
          : 0;
      return Math.min(0.9, totalGain);
    }
    if (config.isResistance) {
      const value = count * increment;
      return Math.min(0.9, value);
    }
    return config.base + count * increment;
  }

  function getStatDisplayString(key) {
    const value = getStatValue(key);
    const config = getStatConfig(key);
    if (!config) return "0";
    const percent = config.isResistance ? Math.round(value * 100) : Math.round(value * 100);
    return `${percent}%`;
  }

  function getUpgradeCost(key) {
    const count = upgradeCounts[key] || 0;
    return Math.max(1, Math.round(BASE_COST * Math.pow(COST_SCALE, count)));
  }

  function canUpgrade(key, currentKeys) {
    return Number.isFinite(currentKeys) && currentKeys >= getUpgradeCost(key);
  }

  function applyUpgrade(key) {
    if (!STAT_CONFIGS[key]) return;
    upgradeCounts[key] = (upgradeCounts[key] || 0) + 1;
  }

  function getUpgradeCount(key) {
    return upgradeCounts[key] || 0;
  }

  function getStatKeys() {
    return statKeys.slice();
  }

  function getLabel(key) {
    const config = getStatConfig(key);
    return config?.label || key;
  }

  function getDescription(key) {
    const config = getStatConfig(key);
    return config?.description || "";
  }

  window.StatsManager = {
    getStatKeys,
    getStatLabel: getLabel,
    getStatDescription: getDescription,
    getStatValue,
    getStatDisplayString,
    getUpgradeCost,
    applyUpgrade,
    getUpgradeCount,
    resetStats: resetCounts,
    getStatMultiplier: getStatValue,
    canUpgrade,
  };
})(typeof window !== "undefined" ? window : null);
