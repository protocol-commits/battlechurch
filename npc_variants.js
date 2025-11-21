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
    "earring_emerald_silver_walk.png",
    "earring_emerald_walk.png",
    "earring_red_silver_walk.png",
    "earring_red_walk.png",
    "glasses_sun_walk.png",
    "glasses_walk.png",
    "hat_cowboy_walk.png",
    "hat_lucky_walk.png",
    "hat_pumpkin_purple_walk.png",
    "hat_pumpkin_walk.png",
    "hat_witch_walk.png",
    "mask_clown_blue_walk.png",
    "mask_clown_red_walk.png",
    "mask_spooky_walk.png",
  ];

  const ns = global.BattlechurchNpcVariants || (global.BattlechurchNpcVariants = {});
  ns.hair = hairVariants;
  ns.clothing = clothingVariants;
  ns.accessories = accessoryVariants;
})(typeof window !== "undefined" ? window : globalThis);
