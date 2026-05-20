(function(global) {
  const missionBriefScenarios = [
    {
      title: "Death of a close family member",
      waveArc: [
        "Shock and Numbness",
        "Waves of Grief",
        "Fighting for Hope Beyond Grief",
      ],
      recap: "Helped the members through the death of a close family member.\nThey went on to help others, and some were added to the church plant:",
    },
    {
      title: "Death of a spouse",
      waveArc: [
        "Grief and Emptiness",
        "Feeling Alone",
        "Fighting for Faith Through Loneliness",
      ],
      recap: "Helped the members through the death of a spouse.\nThey went on to help others, and some were added to the church plant:",
    },
    {
      title: "Divorce",
      waveArc: [
        "Acute Grief",
        "Rejection and Fear of the Future",
        "Fighting for Peace and Healing",
      ],
      recap: "Helped the members through divorce.\nThey went on to help others, and some were added to the church plant:",
    },
    {
      title: "Ongoing marital conflict",
      waveArc: [
        "Resentment and Bitterness",
        "Emotional Exhaustion",
        "Fighting for Reconciliation",
      ],
      recap: "Helped the members through ongoing marital conflict.\nThey went on to help others, and some were added to the church plant:",
    },
    {
      title: "Loss of a job",
      waveArc: [
        "Panic and Loss of Security",
        "Shame and Self-Doubt",
        "Fighting for Trust in God’s Provision",
      ],
      recap: "Helped the members through loss of a job.\nThey went on to help others, and some were added to the church plant:",
    },
    {
      title: "Long-term unemployment",
      waveArc: [
        "Discouragement",
        "Feeling Hopeless and Left Behind",
        "Fighting for Purpose and Hope",
      ],
      recap: "Helped the members through long-term unemployment.\nThey went on to help others, and some were added to the church plant:",
    },
    {
      title: "Severe financial hardship",
      waveArc: [
        "Anxiety and Despair",
        "Fear and Shame",
        "Fighting for Daily Trust",
      ],
      recap: "Helped the members through severe financial hardship.\nThey went on to help others, and some were added to the church plant:",
    },
    {
      title: "Foreclosure or loss of a home",
      waveArc: [
        "Shock and Instability",
        "Fear and Shame",
        "Fighting for Peace and Stability",
      ],
      recap: "Helped the members through foreclosure or loss of a home.\nThey went on to help others, and some were added to the church plant:",
    },
    {
      title: "Chronic illness",
      waveArc: [
        "Weariness and Uncertainty",
        "Fatigue and Frustration",
        "Fighting for Faith Through Pain",
      ],
      recap: "Helped the members through chronic illness.\nThey went on to help others, and some were added to the church plant:",
    },
    {
      title: "Caring for a terminally ill loved one",
      waveArc: [
        "Anticipatory Grief",
        "Caregiver Burnout",
        "Fighting for Strength to Keep Caring",
      ],
      victoryPhrase: "the weight of caring for a terminally ill loved one",
      recap: "Helped the members through caring for a terminally ill loved one.\nThey went on to help others, and some were added to the church plant:",
    },
    {
      title: "Mental health struggles",
      waveArc: [
        "Racing Thoughts and Numbness",
        "Feeling Alone and Trapped",
        "Fighting for Light and Help",
      ],
      recap: "Helped the members through mental health struggles.\nThey went on to help others, and some were added to the church plant:",
    },
    {
      title: "Addiction",
      waveArc: [
        "Cravings and Triggers",
        "Shame and Self-Condemnation",
        "Fighting for Freedom",
      ],
      recap: "Helped the members through addiction.\nThey went on to help others, and some were added to the church plant:",
    },
    {
      title: "Relapse after recovery",
      waveArc: [
        "Despair After Relapse",
        "Shame and Self-Condemnation",
        "Fighting for Restoration",
      ],
      recap: "Helped the members through relapse after recovery.\nThey went on to help others, and some were added to the church plant:",
    },
    {
      title: "Caring for an aging parent",
      waveArc: [
        "Overwhelm and Grief",
        "Compassion Fatigue",
        "Fighting for Grace in Daily Care",
      ],
      victoryPhrase: "the weight of caring for an aging parent",
      recap: "Helped the members through caring for an aging parent.\nThey went on to help others, and some were added to the church plant:",
    },
    {
      title: "Raising a child with special needs",
      waveArc: [
        "Fear and Helplessness",
        "Isolation and Burnout",
        "Fighting for Enduring Love and Patience",
      ],
      recap: "Helped the members through raising a child with special needs.\nThey went on to help others, and some were added to the church plant:",
    },
    {
      title: "Raising a troubled child",
      waveArc: [
        "Fear and Turmoil",
        "Helplessness and Heartbreak",
        "Fighting for Hope for Their Child",
      ],
      recap: "Helped the members through raising a troubled child.\nThey went on to help others, and some were added to the church plant:",
    },
    {
      title: "Betrayal by a close friend",
      waveArc: [
        "Shock and Anger",
        "Mistrust and Bitterness",
        "Fighting for Forgiveness and Wisdom",
      ],
      recap: "Helped the members through betrayal by a close friend.\nThey went on to help others, and some were added to the church plant:",
    },
    {
      title: "Deep loneliness",
      waveArc: [
        "Feeling Alone",
        "Fear of Rejection",
        "Fighting for Belonging and Connection",
      ],
      recap: "Helped the members through deep loneliness.\nThey went on to help others, and some were added to the church plant:",
    },
    {
      title: "Workplace hostility",
      waveArc: [
        "Stress and Pressure",
        "Fear and Anxiety",
        "Fighting for Courage and Integrity",
      ],
      recap: "Helped the members through workplace hostility.\nThey went on to help others, and some were added to the church plant:",
    },
  ];

  const ns = global.BattlechurchMissionBrief || (global.BattlechurchMissionBrief = {});
  ns.scenarios = missionBriefScenarios;
})(typeof window !== "undefined" ? window : globalThis);