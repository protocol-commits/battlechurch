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
    { id: "pine_hollow", name: "Pine Hollow", districtId: "northwest", x: 0.18, y: 0.3502 },
    { id: "stone_ridge", name: "Stone Ridge", districtId: "northwest", x: 0.3258, y: 0.48 },
    { id: "northvale", name: "Northvale", districtId: "northwest", x: 0.2893, y: 0.74 },

    // Ashvale (northeast) — middle column
    { id: "red_creek", name: "Red Creek", districtId: "northeast", x: 0.4636, y: 0.22 },
    { id: "ash_crossing", name: "Ash Crossing", districtId: "northeast", x: 0.50, y: 0.48 },
    { id: "millhaven", name: "Millhaven", districtId: "northeast", x: 0.5547, y: 0.8702 },

    // Lowmarch (southwest) — right column (upper 2/3)
    { id: "lowmoor", name: "Lowmoor", districtId: "southwest", x: 0.6560, y: 0.18 },
    { id: "brackton", name: "Brackton", districtId: "southwest", x: 0.82, y: 0.3093 },
    { id: "marsh_end", name: "Marsh End", districtId: "southwest", x: 0.6633, y: 0.4573 },

    // Capital (final boss) — right column (lower 1/3)
    { id: "highgate", name: "Highgate", type: "capital", x: 0.7836, y: 0.6972 },
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
