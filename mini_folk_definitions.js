(function(global) {
  const miniFolks = [
    { key: "miniImp", src: "assets/sprites/MinifolksDemons/Without outline/MiniImp.png" },
    { key: "miniFireImp", src: "assets/sprites/MinifolksDemons/Without outline/MiniFireImp.png" },
    { key: "miniDemoness", src: "assets/sprites/MinifolksDemons/Without outline/MiniDemoness.png" },
    { key: "miniClawedDemon", src: "assets/sprites/MinifolksDemons/Without outline/MiniClawedDemon.png" },
    { key: "miniHighDemon", src: "assets/sprites/MinifolksDemons/Without outline/MiniHighDemon.png" },
    { key: "miniDemonTormentor", src: "assets/sprites/MinifolksDemons/Without outline/MiniDemonTormentor.png" },
    { key: "miniDemonLord", src: "assets/sprites/MinifolksDemons/Without outline/MiniDemonLord.png" },
    { key: "miniDemonFireThrower", src: "assets/sprites/MinifolksDemons/Without outline/MiniDemonFireThrower.png" },
    { key: "miniDemonFireKeeper", src: "assets/sprites/MinifolksDemons/Without outline/MiniDemonFireKeeper.png" },
    { key: "miniSuccubus", src: "assets/sprites/MinifolksDemons/Without outline/MiniSuccubus.png" },
    { key: "miniSkeleton", src: "assets/sprites/MinifolksUndead/Without Outline/MiniSkeleton.png" },
    { key: "miniSkeletonArcher", src: "assets/sprites/MinifolksUndead/Without Outline/MiniSkeletonArcher.png" },
    { key: "miniZombie", src: "assets/sprites/MinifolksUndead/Without Outline/MiniZombie.png" },
    { key: "miniZombieButcher", src: "assets/sprites/MinifolksUndead/Without Outline/MiniZombieButcher.png" },
    { key: "miniReaper", src: "assets/sprites/MinifolksUndead/Without Outline/MiniReaper.png" },
    { key: "miniGhost", src: "assets/sprites/MinifolksUndead/Without Outline/MiniGhost.png" },
    { key: "miniLich", src: "assets/sprites/MinifolksUndead/Without Outline/MiniLich.png" },
    { key: "miniNecromancer", src: "assets/sprites/MinifolksUndead/Without Outline/MiniNecromancer.png" },
    { key: "miniDeathKnight", src: "assets/sprites/MinifolksUndead/Without Outline/MiniDeathKnight.png" },
    { key: "miniDreadKnight", src: "assets/sprites/MinifolksUndead/Without Outline/MiniDreadKnight.png" },
  ];

  const ns = global.BattlechurchMiniFolks || (global.BattlechurchMiniFolks = {});
  ns.list = miniFolks;
})(typeof window !== "undefined" ? window : globalThis);
