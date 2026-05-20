(function(global) {
  const lines = [
    "Things have been hopeless for years. We're glad you're here.",
    "We have been praying for someone to stand with us.",
    "Thank you for coming to shepherd us.",
    "It helps to know we're not facing this alone.",
    "We're ready to stand together.",
    "Hope feels possible again.",
    "We're trusting God to carry us through this.",
    "We're grateful you're leading us.",
    "We'll hold fast together.",
  ];

  const linesByCampaign = {
    p1: [
"I'm glad you're here.",
"...Like something's pressing in.",
"Things fade here.",
"You start to feel it after a while.",
"We could use some direction.",
"We've tried to keep things going.",
"It gets heavy some days.",
"We're not sure what to do next.",
"They just… drifted off.",
"It might help to have someone steady.",
"It wasn't always like this.",
"We've been waiting.",
"Some days feel longer than they are.",
"Not much left to hold onto.",
"People don't talk about it.",
"We almost stopped meeting.",
"It wears you down.",
"We need a way forward.",
    ],
    p2: [
      "Welcome back, Pastor. We're ready to keep pressing forward.",
      "We've seen what God can do here. Let's keep going.",
      "The pressure is still here, but we're stronger now.",
      "We're glad you're leading us again.",
      "We'll stand together and hold the ground we've gained.",
      "Hope is growing in this town.",
      "Let's keep faith and keep moving.",
      "We'll face this together again.",
      "We're ready for what's next.",
    ],
  };

  const waveIntro = {
    firstWave: {
      pastor: {
        text: () => `Let's fight!`,
        life: 2.6,
        delay: 0.35,
      },
      responses: [
        { text: "I'm excited to get started.", life: 3.2, delay: 1.35 },
        { text: "Let's face this together.", life: 3.6, delay: 2.45 },
        { text: "Let's do this.", life: 3.6, delay: 2.45 },
        { text: "Attack!", life: 3.6, delay: 2.45 },
      ],
    },
  };

  const waveEnd = {
    maxSpeakers: 5,
    longLineLife: 6.2,
    shortLineLife: 5.4,
    tierOrder: ["full", "high", "mid", "low", "critical"],
    longLine: (faith, formationLabel) => `${faith}: This ${formationLabel} is really helping me.`,
    linesByTier: {
      full: [
        (faith) => `${faith}: Love this!`,
        (faith) => `${faith}: Excited!`,
        (faith) => `${faith}: Feeling strong!`,
      ],
      high: [
        (faith) => `${faith}: This is helping.`,
        (faith) => `${faith}: Feeling better.`,
        (faith) => `${faith}: I'm with you!`,
      ],
      mid: [
        (faith) => `${faith}: I'm hanging in there.`,
        (faith) => `${faith}: Doing a little better.`,
        (faith) => `${faith}: Keeping up.`,
      ],
      low: [
        (faith) => `${faith}: This is hard.`,
        (faith) => `${faith}: I'm still struggling.`,
        (faith) => `${faith}: Trying to stay focused.`,
      ],
      critical: [
        (faith) => `${faith}: I'm really discouraged.`,
        (faith) => `${faith}: I'm barely holding on.`,
        (faith) => `${faith}: Please don't give up on me.`,
      ],
    },
  };

  const redFaith = {
    thresholdRatio: 0.33,
    life: 5.8,
    lines: [
      (formationLabel) => `I don't think this ${formationLabel} is working for me.`,
      (formationLabel) => `I'm having a hard time with this ${formationLabel}.`,
      (formationLabel) => `This ${formationLabel} isn't reaching me right now.`,
      (formationLabel) => `I'm feeling discouraged in this ${formationLabel}.`,
      (formationLabel) => `I want this ${formationLabel} to help, but I'm struggling.`,
    ],
  };


  const lostFaith = [
"I can't do this anymore.",
"I'm just... tired.",
"I tried. I really tried.",
"I thought I could hold on.",
"I'm not strong enough for this.",
"I don't have anything left.",
"I need to step away.",
"I can't keep up anymore.",
"I wasn't ready for this.",
"I think I need to leave.",
"I don't feel like myself anymore.",
"I wanted this to work.",
  ];

  const ns = global.BattlechurchCongregationDialogue || (global.BattlechurchCongregationDialogue = {});
  ns.lines = lines;
  ns.linesByCampaign = linesByCampaign;
  ns.waveIntro = waveIntro;
  ns.waveEnd = waveEnd;
  ns.redFaith = redFaith;
  ns.lostFaith = lostFaith;
})(typeof window !== "undefined" ? window : globalThis);
