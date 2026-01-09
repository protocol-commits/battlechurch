(function(global) {
  const missionBriefScenarios = [
    "the loss of a loved one",
    "losing a child",
    "the sudden loss of a close friend",
    "a serious medical diagnosis",
    "chronic illness",
    "the strain of long-term care for a loved one",
    "a failing marriage",
    "estrangement from a child",
    "constant conflict at home",
    "the loss of a job",
    "an inability to forgive a family member",
    "the slow decline of a loved one’s health",
    "financial pressure they can’t escape",
    "starting over after everything fell apart",
    "carrying overwhelming and unfair responsibilities"
  ];

  const ns = global.BattlechurchMissionBrief || (global.BattlechurchMissionBrief = {});
  ns.scenarios = missionBriefScenarios;
})(typeof window !== "undefined" ? window : globalThis);
