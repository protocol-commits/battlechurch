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
"I can't hold on much longer.",
"What's the point anymore?",
"Why is this happening to us?",
"It's too much...",
"I barely sleep now.",
"Every day feels heavier.",
"We're running out of strength.",
"I don't know how much longer we can do this.",
"It feels like the dark keeps getting closer.",
"I keep waiting for relief, but it never comes.",
"We're trying to stay together.",
"Families are breaking under this.",
"We keep losing ground.",
"It feels like hope is slipping away.",
"Everything feels unstable.",
"We're exhausted.",
"It never lets up.",
"We're scared of what comes next.",
"People are shutting down.",
"No one knows how to fix this.",
"We've been carrying this for too long.",
"I don't recognize this place anymore.",
"The pressure won't stop.",
"Some of us are barely hanging on.",
"We need help now.",
"We're out of answers.",
"We're trying not to fall apart.",
"I hate seeing everyone like this.",
"We're stuck in survival mode.",
"I keep asking why this won't end.",
"It's like we're drowning slowly.",
"The fear is everywhere.",
"We can't keep pretending we're fine.",
"We're losing people to despair.",
"This town feels wounded.",
"I don't want to give up, but it's hard.",
"Everything feels fragile.",
"Even the kids can feel it.",
"This darkness is tearing us apart.",
"I just want one peaceful day.",
"We need something to change.",
"We're stretched past our limit.",
"I feel helpless watching this happen.",
"We're trying to hold the line.",
"We're tired of surviving.",
"Please tell me this can turn around.",
"We're desperate for a breakthrough.",
"We're close to breaking.",
"We're trying to keep faith alive.",
"I don't want to lose anyone else.",
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

  const teaser = {
    // Battle teaser ambient speech tuning.
    maxConcurrentSpeakers: 3,
    minIntervalSec: 1.9,
    maxIntervalSec: 3.0,
    bubbleLifeSec: 3.9,
    bubbleFadeDelaySec: 2.8,
    lines: [
      "I can't hold on much longer.",
      "What's the point anymore?",
      "Why is this happening to us?",
      "It's too much...",
      "I barely sleep now.",
      "Every day feels heavier.",
      "We're running out of strength.",
      "I don't know how much longer we can do this.",
      "It feels like the dark keeps getting closer.",
      "Families are breaking under this.",
      "We keep losing ground.",
      "Hope feels so far away.",
      "We're exhausted.",
      "It never lets up.",
      "We're scared of what comes next.",
      "No one knows how to stop this.",
      "We've been carrying this for too long.",
      "The pressure won't stop.",
      "Some of us are barely hanging on.",
      "We're out of answers.",
      "We're trying not to fall apart.",
      "I hate seeing everyone like this.",
      "We're stuck in survival mode.",
      "It's like we're drowning slowly.",
      "The fear is everywhere.",
      "We can't keep pretending we're fine.",
      "We're losing people to despair.",
      "I don't want to give up, but it's hard.",
      "Everything feels fragile.",
      "This darkness is tearing us apart.",
      "We're stretched past our limit.",
      "Please tell me this can turn around.",
      "We're desperate for a breakthrough.",
      "We're close to breaking.",
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
    longLine: () => `Steady now`,
    linesByTier: {
      full: [
        () => `Excited`,
        () => `Feeling strong`,
        () => `Thank you`,
        () => `This helps so much`,
        () => `You're a blessing`,
      ],
      high: [
        () => `Doing fine`,
        () => `Feeling better`,
        () => `Still strong`,
        () => `This is helping`,
        () => `Thanks`,
      ],
      mid: [
        () => `Holding on`,
        () => `Keeping up`,
        () => `Still trying`,
      ],
      low: [
        () => `I'm hurting`,
        () => `I'm struggling`,
        () => `I need help`,
      ],
      critical: [
        () => `I'm wery weak`,
        () => `I'm losing hope`,
        () => `Please help`,
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
  ns.teaser = teaser;
})(typeof window !== "undefined" ? window : globalThis);
