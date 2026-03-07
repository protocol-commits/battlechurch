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
    // Westreach (northwest) — 8:00 to 12:00 arc
    { id: "pine_hollow", name: "Pine Hollow", districtId: "northwest", x: 0.18, y: 0.28 }, // move me later
    { id: "stone_ridge", name: "Stone Ridge", districtId: "northwest", x: 0.25, y: 0.55 }, // move me later
    { id: "northvale", name: "Northvale", districtId: "northwest", x: 0.38, y: 0.35 }, // move me later

    // Ashvale (northeast) — 12:00 to 4:00 arc
    { id: "red_creek", name: "Red Creek", districtId: "northeast", x: 0.52, y: 0.35 }, // move me later
    { id: "ash_crossing", name: "Ash Crossing", districtId: "northeast", x: 0.69, y: 0.48 }, // move me later
    { id: "millhaven", name: "Millhaven", districtId: "northeast", x: 0.72, y: 0.69 }, // move me later

    // Lowmarch (southwest) — 4:00 to 8:00 arc (bottom)
    { id: "lowmoor", name: "Lowmoor", districtId: "southwest", x: 0.59, y: 0.83 }, // move me later
    { id: "brackton", name: "Brackton", districtId: "southwest", x: 0.45, y: 0.87 }, // move me later
    { id: "marsh_end", name: "Marsh End", districtId: "southwest", x: 0.31, y: 0.86 }, // move me later

    // Capital (final boss) — center
    { id: "highgate", name: "Highgate", type: "capital", x: 0.486, y: 0.56 }, // move me later
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

  window.BattlechurchMapData = {
    districts,
    towns,
    calculateStars,
    getDefaultTownStartCount,
    getDistricts,
    getTowns,
    getTownsByDistrict,
    getFirstTownId,
  };
})(typeof window !== "undefined" ? window : null);
