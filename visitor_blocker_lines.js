(function(global) {
  const blockerLines = [
    "Look at my nephew pic!",
    "Bless this casserole plz!",
    "Choir drama update!",
    "Font crisis again!",
    "Cat birthday invite!",
    "Try my potato salad!",
    "Carpet question quick!",
    "Dream I gotta share!",
    "See my garden gnome!",
    "Check out this meme!",
    "Smell this candle!",
    "Rate my casserole!",
    "Need bulletin advice!",
    "Want to hear a pun?",
    "Look at these coupons!",
    "Guess what I baked!",
  ];

  const ns = global.BattlechurchVisitorBlocker || (global.BattlechurchVisitorBlocker = {});
  ns.blockerLines = blockerLines;
})(typeof window !== "undefined" ? window : globalThis);
