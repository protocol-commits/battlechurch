(function setupMapData(window) {
  if (!window) return;

  const districts = [
    { id: "westreach", name: "Westreach", order: 0 },
    { id: "ashvale", name: "Ashvale", order: 1 },
    { id: "rivergate", name: "Rivergate", order: 2 },
  ];

  const towns = [
    // Westreach
    { id: "pine-hollow", name: "Pine Hollow", districtId: "westreach", x: 0.16, y: 0.32 }, // move me later
    { id: "stone-ridge", name: "Stone Ridge", districtId: "westreach", x: 0.24, y: 0.46 }, // move me later
    { id: "northvale", name: "Northvale", districtId: "westreach", x: 0.2, y: 0.74 }, // move me later

    // Ashvale
    { id: "red-creek", name: "Red Creek", districtId: "ashvale", x: 0.5, y: 0.34 }, // move me later
    { id: "ash-crossing", name: "Ash Crossing", districtId: "ashvale", x: 0.58, y: 0.48 }, // move me later
    { id: "millhaven", name: "Millhaven", districtId: "ashvale", x: 0.48, y: 0.76 }, // move me later

    // Rivergate
    { id: "havenridge", name: "Havenridge", districtId: "rivergate", x: 0.76, y: 0.32 }, // move me later
    { id: "lowmoor", name: "Lowmoor", districtId: "rivergate", x: 0.84, y: 0.48 }, // move me later
    { id: "duston", name: "Duston", districtId: "rivergate", x: 0.76, y: 0.8 }, // move me later
  ];

  function calculateStars(congregationCount) {
    const score = Number(congregationCount) || 0;
    if (score >= 151) return 3;
    if (score >= 126) return 2;
    if (score >= 100) return 1;
    return 0;
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
    getDistricts,
    getTowns,
    getTownsByDistrict,
    getFirstTownId,
  };
})(typeof window !== "undefined" ? window : null);
