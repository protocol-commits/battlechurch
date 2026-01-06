(function(global) {
  const hairVariants = [
    "bob_walk.png",
    "braids_walk.png",
    "buzzcut_walk.png",
    "curly_walk.png",
    "emo_walk.png",
    "extra_long_walk.png",
    "french_curl_walk.png",
    "gentleman_walk.png",
    "long_straight_walk.png",
    "midiwave_walk.png",
    "ponytail_walk.png",
    "spacebuns_walk.png",
    "wavy_walk.png",
  ];

  const clothingVariants = [
    "basic_walk.png",
    "clown_walk.png",
    "dress_walk.png",
    "floral_walk.png",
    "overalls_walk.png",
    "pants_suit_walk.png",
    "pants_walk.png",
    "pumpkin_walk.png",
    "sailor_bow_walk.png",
    "sailor_walk.png",
    "skirt_walk.png",
    "skull_walk.png",
    "spaghetti_walk.png",
    "spooky_walk.png",
    "sporty_walk.png",
    "stripe_walk.png",
    "suit_walk.png",
    "witch_walk.png",
  ];

  const accessoryVariants = [
    "beard_walk.png",
    "glasses_sun_walk.png",
    "glasses_walk.png",
    "hat_cowboy_walk.png",
    "hat_lucky_walk.png",
  ];

  const ns = global.BattlechurchNpcVariants || (global.BattlechurchNpcVariants = {});
  ns.hair = hairVariants;
  ns.clothing = clothingVariants;
  ns.accessories = accessoryVariants;
  ns.hairByGender = {
    male: [
      "buzzcut_walk.png",
      "gentleman_walk.png",
      "emo_walk.png",
    ],
    female: [
      "bob_walk.png",
      "braids_walk.png",
      "curly_walk.png",
      "extra_long_walk.png",
      "french_curl_walk.png",
      "long_straight_walk.png",
      "midiwave_walk.png",
      "ponytail_walk.png",
      "spacebuns_walk.png",
      "wavy_walk.png",
    ],
    unisex: [
      "curly_walk.png",
      "emo_walk.png",
      "bob_walk.png",
      "wavy_walk.png",
    ],
  };
  ns.clothingByGender = {
    male: [
      "basic_walk.png",
      "pants_walk.png",
      "pants_suit_walk.png",
      "sporty_walk.png",
      "stripe_walk.png",
      "suit_walk.png",
      "skull_walk.png",
      "spooky_walk.png",
      "clown_walk.png",
      "sailor_walk.png",
    ],
    female: [
      "dress_walk.png",
      "floral_walk.png",
      "sailor_bow_walk.png",
      "skirt_walk.png",
      "spaghetti_walk.png",
      "witch_walk.png",
      "overalls_walk.png",
      "pumpkin_walk.png",
    ],
    unisex: [
      "basic_walk.png",
      "overalls_walk.png",
      "pumpkin_walk.png",
      "sailor_walk.png",
      "clown_walk.png",
    ],
  };
})(typeof window !== "undefined" ? window : globalThis);
