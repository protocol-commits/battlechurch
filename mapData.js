(function setupMapData(window) {
  if (!window) return;

  const districts = [
    { id: "northwest", name: "Westreach", order: 0 },
    { id: "northeast", name: "Ashvale", order: 1 },
    { id: "southwest", name: "Lowmarch", order: 2 },
  ];

  // Active towns (3 per district) + capital = 10 total for current pacing.
  // Keep these as the first three in each district list.
  const towns = [
    // Westreach (northwest) — left column
    { id: "pine_hollow", name: "Pine Hollow", districtId: "northwest", x: 0.1654, y: 0.3502 },
    { id: "stone_ridge", name: "Stone Ridge", districtId: "northwest", x: 0.2894, y: 0.48 },
    { id: "northvale", name: "Northvale", districtId: "northwest", x: 0.3403, y: 0.7400 },

    // Ashvale (northeast) — middle column
    { id: "red_creek", name: "Red Creek", districtId: "northeast", x: 0.5183, y: 0.22 },
    { id: "ash_crossing", name: "Ash Crossing", districtId: "northeast", x: 0.5073, y: 0.48 },
    { id: "millhaven", name: "Millhaven", districtId: "northeast", x: 0.5256, y: 0.8897 },

    // Lowmarch (southwest) — right column (upper 2/3)
    { id: "lowmoor", name: "Lowmoor", districtId: "southwest", x: 0.7107, y: 0.18 },
    { id: "brackton", name: "Brackton", districtId: "southwest", x: 0.8091, y: 0.3549 },
    { id: "marsh_end", name: "Marsh End", districtId: "southwest", x: 0.6924, y: 0.4833 },

    // Capital (final boss) — right column (lower 1/3)
    { id: "highgate", name: "Highgate", type: "capital", x: 0.7836, y: 0.7102 },
  ];


  function calculateStars(congregationCount) {
    const score = Number(congregationCount) || 0;
    if (score >= 151) return 3;
    if (score >= 126) return 2;
    if (score >= 100) return 1;
    return 0;
  }

  function getDefaultTownStartCount(townId) {
    void townId;
    return 50;
  }

  function getDistricts() {
    return districts.slice().sort((a, b) => a.order - b.order);
  }

  function getTowns() {
    return towns.slice();
  }

  function getTownsByDistrict(districtId) {
    return towns.filter((town) => town.districtId === districtId);
  }

  function getFirstTownId() {
    const firstDistrict = getDistricts()[0];
    if (!firstDistrict) return null;
    const districtTowns = getTownsByDistrict(firstDistrict.id);
    return districtTowns.length ? districtTowns[0].id : null;
  }

  // Alias for getDistricts() — returns counties sorted by order
  function getBattlechurchCounties() {
    return getDistricts();
  }

  window.BattlechurchMapData = {
    districts,
    towns,
    calculateStars,
    getDefaultTownStartCount,
    getDistricts,
    getBattlechurchCounties,
    getTowns,
    getTownsByDistrict,
    getFirstTownId,
  };
})(typeof window !== "undefined" ? window : null);
