(function setupMapData(window) {
  if (!window) return;

  const districts = [
    { id: "northwest", name: "Westreach", order: 0 },
    { id: "northeast", name: "Ashvale", order: 1 },
    { id: "southwest", name: "Lowmarch", order: 2 },
    { id: "southeast", name: "Rivergate", order: 3 },
  ];

  // Active towns (3 per district) + capital = 13 total for current pacing.
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

    // Rivergate (southeast)
    { id: "havenridge", name: "Havenridge", districtId: "southeast", x: 0.6, y: 0.58 }, // move me later
    { id: "duston", name: "Duston", districtId: "southeast", x: 0.72, y: 0.68 }, // move me later
    { id: "southbank", name: "Southbank", districtId: "southeast", x: 0.56, y: 0.74 }, // move me later

    // Capital (final boss)
    { id: "highgate", name: "Highgate", type: "capital", x: 0.475, y: 0.49 }, // move me later
  ];

  // Future towns (unused for now): keep names/coords for expansion back to 25.
  // Do not delete; this is intentional to help future development.
  const futureUnusedTowns = [
    // Westreach (northwest)
    { id: "briarfield", name: "Briarfield", districtId: "northwest", x: 0.36, y: 0.4 }, // move me later
    { id: "cold_run", name: "Cold Run", districtId: "northwest", x: 0.24, y: 0.42 }, // move me later
    { id: "watch_hill", name: "Watch Hill", districtId: "northwest", x: 0.4, y: 0.18 }, // move me later

    // Ashvale (northeast)
    { id: "cinderbrook", name: "Cinderbrook", districtId: "northeast", x: 0.78, y: 0.16 }, // move me later
    { id: "blackmere", name: "Blackmere", districtId: "northeast", x: 0.62, y: 0.46 }, // move me later
    { id: "emberfall", name: "Emberfall", districtId: "northeast", x: 0.78, y: 0.38 }, // move me later

    // Lowmarch (southwest)
    { id: "stillwater", name: "Stillwater", districtId: "southwest", x: 0.34, y: 0.82 }, // move me later
    { id: "reeds_hollow", name: "Reeds Hollow", districtId: "southwest", x: 0.24, y: 0.86 }, // move me later
    { id: "dunfen", name: "Dunfen", districtId: "southwest", x: 0.4, y: 0.76 }, // move me later

    // Rivergate (southeast)
    { id: "fordham", name: "Fordham", districtId: "southeast", x: 0.86, y: 0.6 }, // move me later
    { id: "clearford", name: "Clearford", districtId: "southeast", x: 0.64, y: 0.84 }, // move me later
    { id: "greywater", name: "Greywater", districtId: "southeast", x: 0.78, y: 0.9 }, // move me later
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
    futureUnusedTowns,
    calculateStars,
    getDefaultTownStartCount,
    getDistricts,
    getTowns,
    getTownsByDistrict,
    getFirstTownId,
  };
})(typeof window !== "undefined" ? window : null);
