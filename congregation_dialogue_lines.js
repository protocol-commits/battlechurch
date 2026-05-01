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

  const npcPowerups = {
    life: 5.6,
    linesByEffect: {
      npcScriptureWeapon: [
        "I see how that verse applies!",
        "That passage makes sense to me now.",
        "I can finally see what that scripture means.",
        "That verse is speaking right to this battle.",
        "I know how to stand on that scripture now.",
      ],
      npcFaithWeapon: [
        "I see God's sovereignty in this.",
        "God is still in control here.",
        "I'm learning to trust God in this fight.",
        "I can act in faith here.",
        "The Lord is steady, even in this.",
      ],
      npcWisdomWeapon: [
        "Oh, that's how it applies.",
        "I understand how to use that now.",
        "That gives me wisdom for this battle.",
        "I can see what I need to do now.",
        "That helps me discern what's happening.",
      ],
      harmony: [
        "Let's pray for one another.",
        "We're stronger when we stand together.",
        "Let's stay in one spirit.",
        "I feel us growing closer already.",
        "Let's carry this burden together.",
      ],
    },
  };

  const battleVictory = {
    maxSpeakers: 5,
    life: 5.6,
    staggerStep: 0.18,
    lines: [
      "We stood firm together.",
      "The Lord carried us through that battle.",
      "That darkness didn't get the last word.",
      "I'm not as afraid as I was before.",
      "Prayer is changing how I face this fight.",
      "We're learning how to resist together.",
      "I feel stronger after that battle.",
      "The truth is starting to take hold in me.",
      "I can see hope again after that fight.",
      (formationLabel) => `This ${formationLabel} is helping me stand firm.`,
      (formationLabel) => `Our ${formationLabel} gave me strength for that battle.`,
      (formationLabel) => `I'm starting to understand how this ${formationLabel} helps me fight.`,
    ],
  };

  const welcomeLines = [
    "Tip: Press W, A, S, D keys to move, or you can use an X-Box controller.",
    'Tip: "A" button is the LEFT key. "B" button is DOWN key. "C" button is the RIGHT key.',
    "Tip: Your Prayer Meter fills as you smite enemies. (Not shown here).",
    "Tip: Your Prayer Meter holds 6 Prayers. Prayer moves spend Prayers.",
    'Tip: The little circle below you means Button B is ready, including B-combos.',
    "Tip: Hold B to dash further toward a powerup.",
    "Tip: Hold A + Hold B for a Blitz!",
    "Tip: Press A then B quickly for Cleave.",
    "Tip: Press B then A quickly for a Rush.",
    "Tip: Tap C to make us fire at enemies!",
    "Tip: Hold C down for Purge!",
    "Tip: Double-tap C and we'll protect you!",
    "Tip: Hold C + Hold A for a Holy Ground ring of fire.",
    "Tip: Hold B + Hold C to Blink Teleport to a powerup.",
    "Tip: Tap C then A quickly for Spin.",
  ];

  const welcomeLinesXbox = [
    "Tip: Use Left Stick or D-Pad to move.",
    'Tip: Controller mapping: "A" is Button A, "B" is Button B, and "C" is RB.',
    "Tip: Your Prayer Meter fills as you smite enemies. (Not shown here).",
    "Tip: Your Prayer Meter holds 6 Prayers. Prayer moves spend Prayers.",
    'Tip: The little circle below you means Button B is ready, including B-combos.',
    "Tip: Hold B to dash further toward a powerup.",
    "Tip: Hold A + Hold B for a Blitz!",
    "Tip: Press A then B quickly for Cleave.",
    "Tip: Press B then A quickly for a Rush.",
    "Tip: Tap RB to make us fire at enemies!",
    "Tip: Hold RB for Purge!",
    "Tip: Double-tap RB and we'll protect you!",
    "Tip: Hold RB + Hold A for a Holy Ground ring of fire.",
    "Tip: Hold B + Hold RB to Blink Teleport to a powerup.",
    "Tip: Tap RB then A quickly for Spin.",
    "Tip: Press Menu button to start the fight.",
  ];

  const ns = global.BattlechurchCongregationDialogue || (global.BattlechurchCongregationDialogue = {});
  ns.lines = lines;
  ns.linesByCampaign = linesByCampaign;
  ns.welcomeLines = welcomeLines;
  ns.welcomeLinesXbox = welcomeLinesXbox;
  ns.waveIntro = waveIntro;
  ns.waveEnd = waveEnd;
  ns.redFaith = redFaith;
  ns.npcPowerups = npcPowerups;
  ns.battleVictory = battleVictory;
})(typeof window !== "undefined" ? window : globalThis);
