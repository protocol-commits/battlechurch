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
    // Westreach (northwest)
    { id: "pine_hollow", name: "Pine Hollow", districtId: "northwest", x: 0.1, y: 0.14 }, // move me later
    { id: "stone_ridge", name: "Stone Ridge", districtId: "northwest", x: 0.3, y: 0.26 }, // move me later
    { id: "northvale", name: "Northvale", districtId: "northwest", x: 0.16, y: 0.36 }, // move me later

    // Ashvale (northeast)
    { id: "red_creek", name: "Red Creek", districtId: "northeast", x: 0.6, y: 0.18 }, // move me later
    { id: "ash_crossing", name: "Ash Crossing", districtId: "northeast", x: 0.72, y: 0.26 }, // move me later
    { id: "millhaven", name: "Millhaven", districtId: "northeast", x: 0.58, y: 0.36 }, // move me later

    // Lowmarch (southwest)
    { id: "lowmoor", name: "Lowmoor", districtId: "southwest", x: 0.24, y: 0.58 }, // move me later
    { id: "brackton", name: "Brackton", districtId: "southwest", x: 0.36, y: 0.64 }, // move me later
    { id: "marsh_end", name: "Marsh End", districtId: "southwest", x: 0.22, y: 0.76 }, // move me later

    // Capital (final boss)
    { id: "highgate", name: "Highgate", type: "capital", x: 0.475, y: 0.49 }, // move me later
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
