(function setupMapData(window) {
  if (!window) return;

  // ── Front display names ── change these to rename the fronts anywhere they appear
  const FRONT_NAMES = {
    northwest: "Western Front",
    northeast: "Central Front",
    southwest: "Eastern Front",
    capital:   "Final Front",
  };

  const fronts = [
    { id: "northwest", name: FRONT_NAMES.northwest, order: 0 },
    { id: "northeast", name: FRONT_NAMES.northeast, order: 1 },
    { id: "southwest", name: FRONT_NAMES.southwest, order: 2 },
  ];

  // Active districts (3 per front) + capital = 10 total for current pacing.
  // Keep these as the first three in each front list.
  const districts = [
    // Westreach (northwest) — left column
    { id: "pine_hollow", name: "Pine Hollow", frontId: "northwest", x: 0.1654, y: 0.3502 },
    { id: "stone_ridge", name: "Stone Ridge", frontId: "northwest", x: 0.2894, y: 0.48 },
    { id: "northvale", name: "Northvale", frontId: "northwest", x: 0.3403, y: 0.7400 },

    // Ashvale (northeast) — middle column
    { id: "red_creek", name: "Red Creek", frontId: "northeast", x: 0.5183, y: 0.2894 },
    { id: "ash_crossing", name: "Ash Crossing", frontId: "northeast", x: 0.5073, y: 0.53 },
    { id: "millhaven", name: "Millhaven", frontId: "northeast", x: 0.5256, y: 0.8897 },

    // Lowmarch (southwest) — right column (upper 2/3)
    { id: "lowmoor", name: "Lowmoor", frontId: "southwest", x: 0.7107, y: 0.18 },
    { id: "brackton", name: "Brackton", frontId: "southwest", x: 0.8091, y: 0.3549 },
    { id: "marsh_end", name: "Marsh End", frontId: "southwest", x: 0.6924, y: 0.4833 },

    // Capital (final boss) — right column (lower 1/3)
    { id: "highgate", name: "Highgate", frontName: FRONT_NAMES.capital, type: "capital", x: 0.7836, y: 0.7102 },
  ];

  function getDefaultDistrictStartCount(districtId) {
    void districtId;
    return 50;
  }

  function getFronts() {
    return fronts.slice().sort((a, b) => a.order - b.order);
  }

  function getDistricts() {
    return districts.slice();
  }

  function getDistrictsByFront(frontId) {
    return districts.filter((district) => district.frontId === frontId);
  }

  function getFirstDistrictId() {
    const firstFront = getFronts()[0];
    if (!firstFront) return null;
    const frontDistricts = getDistrictsByFront(firstFront.id);
    return frontDistricts.length ? frontDistricts[0].id : null;
  }

  // Alias for getFronts() — returns counties sorted by order
  function getBattlechurchCounties() {
    return getFronts();
  }

  window.BattlechurchMapData = {
    fronts,
    districts,
    getDefaultDistrictStartCount,
    getFronts,
    getBattlechurchCounties,
    getDistricts,
    getDistrictsByFront,
    getFirstDistrictId,
    // Legacy shims so callers that haven't been updated yet still work
    get towns() { return districts; },
    getFirstTownId() { return getFirstDistrictId(); },
    getTownsByDistrict(frontId) { return getDistrictsByFront(frontId); },
    getDefaultTownStartCount(districtId) { return getDefaultDistrictStartCount(districtId); },
  };
})(typeof window !== "undefined" ? window : null);
