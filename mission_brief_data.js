(function(global) {
  const missionBriefScenarios = [
    {
      title: "Death of a close family member",
      recap: "Helped the members through the death of a close family member.\nThey went on to help others.",
    },
    {
      title: "Death of a spouse",
      recap: "Helped the members through the death of a spouse.\nThey went on to help others.",
    },
    {
      title: "Divorce",
      recap: "Helped the members through divorce.\nThey went on to help others.",
    },
    {
      title: "Ongoing marital conflict",
      recap: "Helped the members through ongoing marital conflict.\nThey went on to help others.",
    },
    {
      title: "Loss of a job",
      recap: "Helped the members through loss of a job.\nThey went on to help others.",
    },
    {
      title: "Long-term unemployment",
      recap: "Helped the members through long-term unemployment.\nThey went on to help others.",
    },
    {
      title: "Severe financial hardship",
      recap: "Helped the members through severe financial hardship.\nThey went on to help others.",
    },
    {
      title: "Foreclosure or loss of a home",
      recap: "Helped the members through foreclosure or loss of a home.\nThey went on to help others.",
    },
    {
      title: "Chronic illness",
      recap: "Helped the members through chronic illness.\nThey went on to help others.",
    },
    {
      title: "Caring for a terminally ill loved one",
      recap: "Helped the members through caring for a terminally ill loved one.\nThey went on to help others.",
    },
    {
      title: "Mental health struggles",
      recap: "Helped the members through mental health struggles.\nThey went on to help others.",
    },
    {
      title: "Addiction",
      recap: "Helped the members through addiction.\nThey went on to help others.",
    },
    {
      title: "Relapse after recovery",
      recap: "Helped the members through relapse after recovery.\nThey went on to help others.",
    },
    {
      title: "Caring for an aging parent",
      recap: "Helped the members through caring for an aging parent.\nThey went on to help others.",
    },
    {
      title: "Parenting a child with special needs",
      recap: "Helped the members through parenting a child with special needs.\nThey went on to help others.",
    },
    {
      title: "Parenting a troubled child",
      recap: "Helped the members through parenting a troubled child.\nThey went on to help others.",
    },
    {
      title: "Betrayal by a close friend",
      recap: "Helped the members through betrayal by a close friend.\nThey went on to help others.",
    },
    {
      title: "Deep loneliness",
      recap: "Helped the members through deep loneliness.\nThey went on to help others.",
    },
    {
      title: "Workplace hostility",
      recap: "Helped the members through workplace hostility.\nThey went on to help others.",
    },
  ];

  const ns = global.BattlechurchMissionBrief || (global.BattlechurchMissionBrief = {});
  ns.scenarios = missionBriefScenarios;
})(typeof window !== "undefined" ? window : globalThis);
