(function(global) {
  const miniFolks = [
    { key: "miniImp", src: "assets/sprites/MinifolksDemons/Without outline/MiniImp.png" },
    { key: "miniImpLevel2", src: "assets/sprites/MinifolksDemons/Without outline/MiniImpLevel2.png" },
    { key: "miniImpLevel3", src: "assets/sprites/MinifolksDemons/Without outline/MiniImpLevel3.png" },
    { key: "miniFireImp", src: "assets/sprites/MinifolksDemons/Without outline/MiniFireImp.png" },
    { key: "miniDemoness", src: "assets/sprites/MinifolksDemons/Without outline/MiniDemoness.png" },
    { key: "miniClawedDemon", src: "assets/sprites/MinifolksDemons/Without outline/MiniClawedDemon.png" },
    { key: "miniHighDemon", src: "assets/sprites/MinifolksDemons/Without outline/MiniHighDemon.png" },
    { key: "miniDemonTormentor", src: "assets/sprites/MinifolksDemons/Without outline/MiniDemonTormentor.png" },
    { key: "miniDemonLord", src: "assets/sprites/MinifolksDemons/Without outline/MiniDemonLord.png" },
    { key: "miniDemonFireThrower", src: "assets/sprites/MinifolksDemons/Without outline/MiniDemonFireThrower.png" },
    { key: "miniDemonFireKeeper", src: "assets/sprites/MinifolksDemons/Without outline/MiniDemonFireKeeper.png" },
    { key: "miniSuccubus", src: "assets/sprites/MinifolksDemons/Without outline/MiniSuccubus.png" },
  ];

  const ns = global.BattlechurchMiniFolks || (global.BattlechurchMiniFolks = {});
  ns.list = miniFolks;
})(typeof window !== "undefined" ? window : globalThis);
