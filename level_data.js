(function(global) {
  const DATA = {
  "devLevelConfig": {
    "meta": {
      "version": 1
    },
    "structure": {
      "levels": 4,
      "monthsPerLevel": 3,
      "battlesPerMonth": 3,
      "defaultHordesPerBattle": 6,
      "defaultHordeDuration": 10
    },
    "globals": {
      "enemyStats": {
        "miniImp": {
          "health": 11,
          "speed": 100,
          "swarmSpacing": 0.1
        },
        "miniImpLevel2": {
          "speed": 50,
          "swarmSpacing": 0.5
        },
        "slime": {
          "health": 100,
          "speed": 25
        },
        "archer": {
          "speed": 75
        },
        "skeleton": {
          "speed": 75,
          "swarmSpacing": 0.2
        },
        "skeletonArcher": {
          "speed": 75
        },
        "swordsman": {
          "speed": 75
        },
        "lancer": {
          "speed": 75
        },
        "priest": {
          "speed": 75
        },
        "wizard": {
          "speed": 75
        },
        "armoredSkeleton": {
          "speed": 25
        },
        "greatswordSkeleton": {
          "speed": 25
        },
        "orc": {
          "speed": 75
        },
        "miniFireImp": {
          "speed": 75
        },
        "miniDemoness": {
          "speed": 50
        },
        "miniClawedDemon": {
          "speed": 50
        },
        "miniDemonTormentor": {
          "speed": 50,
          "specialBehavior": [
            "mini",
            "boss",
            "npcPriority"
          ],
          "scale": 5
        },
        "miniDemonFireThrower": {
          "speed": 75
        },
        "miniDemonFireKeeper": {
          "speed": 75
        },
        "miniSuccubus": {
          "speed": 75
        },
        "miniSkeleton": {
          "speed": 75
        },
        "miniSkeletonArcher": {
          "speed": 75
        }
      },
      "enemyTags": {},
      "mode": "weighted",
      "hiddenEnemies": [
        "lancer",
        "priest",
        "wizard",
        "knight",
        "knightTemplar",
        "orcRider",
        "werewolf",
        "werebear",
        "miniSuccubus",
        "miniZombie",
        "miniZombieButcher",
        "miniReaper",
        "miniLich",
        "miniNecromancer",
        "miniDeathKnight",
        "miniDreadKnight",
        "archer",
        "swordsman"
      ]
    },
    "levels": [
      {
        "index": 1,
        "months": [
          {
            "index": 1,
            "battles": [
              {
                "index": 1,
                "hordes": [
                  {
                    "index": 1,
                    "entries": [
                      {
                        "enemy": "miniDemoness",
                        "count": 1
                      },
                      {
                        "enemy": "miniImpLevel2",
                        "count": 20
                      },
                      {
                        "enemy": "miniDemonTormentor",
                        "count": 1
                      },
                      {
                        "enemy": "slime",
                        "count": 4
                      }
                    ],
                    "weights": {
                      "miniImp": 90,
                      "miniFireImp": 5,
                      "miniDemoness": 0,
                      "miniClawedDemon": 0,
                      "miniHighDemon": 0,
                      "miniDemonTormentor": 0,
                      "miniDemonFireThrower": 0,
                      "miniSkeleton": 0,
                      "slime": 0,
                      "orc": 0,
                      "eliteOrc": 0,
                      "miniDemonLord": 0,
                      "miniImpLevel2": 5,
                      "miniLich": 0,
                      "miniNecromancer": 0,
                      "miniDeathKnight": 0,
                      "miniDreadKnight": 0,
                      "priest": 0,
                      "wizard": 0,
                      "archer": 0,
                      "skeleton": 0,
                      "skeletonArcher": 0,
                      "swordsman": 0,
                      "lancer": 0,
                      "knight": 0,
                      "knightTemplar": 0,
                      "armoredSkeleton": 0,
                      "greatswordSkeleton": 0,
                      "armoredOrc": 0,
                      "orcRider": 0,
                      "armoredAxeman": 0,
                      "werewolf": 0,
                      "werebear": 0,
                      "miniSkeletonArcher": 0,
                      "miniZombie": 0,
                      "miniZombieButcher": 0,
                      "miniReaper": 0,
                      "miniGhost": 0,
                      "miniDemonFireKeeper": 0
                    },
                    "mode": "explicit",
                    "delays": {
                      "miniImpLevel2": 7,
                      "miniFireImp": 11,
                      "slime": 10,
                      "skeleton": 15
                    },
                    "delaysWeighted": {
                      "miniImpLevel2": 5,
                      "slime": 0
                    },
                    "delaysExplicit": {
                      "slime": 3,
                      "miniImp": 10,
                      "orc": 0,
                      "eliteOrc": 0,
                      "miniDemoness": 8,
                      "miniImpLevel2": 5,
                      "skeleton": 0
                    },
                    "allKill": false,
                    "duration": 15
                  },
                  {
                    "index": 2,
                    "entries": [
                      {
                        "enemy": "miniDemonTormentor",
                        "count": 1
                      }
                    ],
                    "weights": {
                      "slime": 0,
                      "skeleton": 0,
                      "archer": 0,
                      "miniImp": 80,
                      "miniImpLevel2": 10,
                      "miniFireImp": 10,
                      "armoredSkeleton": 0,
                      "greatswordSkeleton": 0,
                      "orc": 0
                    },
                    "mode": "explicit",
                    "allKill": false,
                    "duration": 10,
                    "delaysWeighted": {},
                    "delaysExplicit": {}
                  },
                  {
                    "index": 3,
                    "entries": [
                      {
                        "enemy": "miniDemonLord",
                        "count": 1
                      },
                      {
                        "enemy": "miniClawedDemon",
                        "count": 2
                      },
                      {
                        "enemy": "miniDemonTormentor",
                        "count": 1
                      }
                    ],
                    "weights": {
                      "slime": 0,
                      "skeleton": 0,
                      "archer": 1,
                      "miniImp": 90,
                      "miniImpLevel2": 5,
                      "miniFireImp": 5
                    },
                    "delaysWeighted": {
                      "miniImp": 90,
                      "miniImpLevel2": 10
                    },
                    "delaysExplicit": {
                      "miniDemonLord": 7,
                      "miniClawedDemon": 8
                    },
                    "allKill": true,
                    "duration": 10,
                    "mode": "explicit"
                  },
                  {
                    "index": 4,
                    "entries": [
                      {
                        "enemy": "miniClawedDemon",
                        "count": 2
                      },
                      {
                        "enemy": "miniDemonTormentor",
                        "count": 2
                      }
                    ],
                    "weights": {
                      "slime": 0,
                      "skeleton": 0,
                      "archer": 1,
                      "miniImp": 80,
                      "miniImpLevel2": 10,
                      "miniFireImp": 5
                    },
                    "delaysWeighted": {},
                    "delaysExplicit": {
                      "miniClawedDemon": 7
                    },
                    "allKill": false,
                    "duration": 10
                  },
                  {
                    "index": 5,
                    "entries": [
                      {
                        "enemy": "miniImp",
                        "count": 30
                      },
                      {
                        "enemy": "miniDemonTormentor",
                        "count": 2
                      }
                    ],
                    "weights": {
                      "slime": 1,
                      "skeleton": 1,
                      "archer": 1,
                      "miniImp": 90,
                      "miniImpLevel2": 10,
                      "miniFireImp": 10
                    },
                    "delaysWeighted": {},
                    "delaysExplicit": {
                      "miniImp": 8
                    },
                    "allKill": false,
                    "duration": 10
                  },
                  {
                    "index": 6,
                    "entries": [
                      {
                        "enemy": "miniImpLevel2",
                        "count": 10
                      },
                      {
                        "enemy": "miniDemonLord",
                        "count": 1
                      }
                    ],
                    "weights": {
                      "slime": 1,
                      "skeleton": 1,
                      "archer": 1,
                      "miniImp": 90,
                      "miniImpLevel2": 10,
                      "miniFireImp": 10
                    },
                    "delaysWeighted": {},
                    "delaysExplicit": {
                      "miniImp": 8,
                      "miniImpLevel2": 10,
                      "miniDemonLord": 9
                    },
                    "allKill": true,
                    "duration": 10
                  }
                ]
              },
              {
                "index": 2,
                "hordes": [
                  {
                    "index": 1,
                    "entries": [],
                    "weights": {
                      "slime": 1,
                      "skeleton": 1,
                      "archer": 1
                    }
                  },
                  {
                    "index": 2,
                    "entries": [],
                    "weights": {}
                  }
                ]
              }
            ]
          },
          {
            "index": 2,
            "battles": [
              {
                "index": 1,
                "hordes": [
                  {
                    "index": 1,
                    "entries": [],
                    "weights": {
                      "slime": 1,
                      "skeleton": 1,
                      "archer": 1
                    }
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "index": 2,
        "months": [
          {
            "index": 1,
            "battles": [
              {
                "index": 1,
                "hordes": []
              },
              {
                "index": 2,
                "hordes": [
                  {
                    "index": 1,
                    "entries": [],
                    "weights": {
                      "skeleton": 1,
                      "archer": 1,
                      "skeletonArcher": 1,
                      "swordsman": 1,
                      "orc": 1,
                      "priest": 1,
                      "lancer": 1
                    }
                  }
                ]
              }
            ]
          },
          {
            "index": 2,
            "battles": [
              {
                "index": 1,
                "hordes": []
              },
              {
                "index": 2,
                "hordes": [
                  {
                    "index": 1,
                    "entries": [],
                    "weights": {
                      "skeleton": 1,
                      "archer": 1,
                      "skeletonArcher": 1,
                      "swordsman": 1,
                      "orc": 1,
                      "priest": 1,
                      "lancer": 1
                    }
                  }
                ]
              },
              {
                "index": 3,
                "hordes": [
                  {
                    "index": 1,
                    "entries": [],
                    "weights": {
                      "skeleton": 1,
                      "archer": 1,
                      "skeletonArcher": 1,
                      "swordsman": 1,
                      "orc": 1,
                      "priest": 1,
                      "lancer": 1
                    }
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  "hordeEnemyPools": [
    [
      "slime",
      "skeleton",
      "archer",
      "archer"
    ],
    [
      "skeleton",
      "archer",
      "skeletonArcher",
      "skeletonArcher",
      "swordsman",
      "orc",
      "priest",
      "lancer"
    ],
    [
      "wizard",
      "skeletonArcher",
      "knight",
      "knightTemplar",
      "armoredSkeleton",
      "greatswordSkeleton",
      "eliteOrc",
      "orcRider",
      "werewolf",
      "werebear"
    ]
  ],
  "heroEncouragementLines": [
    "Stay sharp, friends!",
    "Hold the line!",
    "We’re stronger together!",
    "Keep the faith steady!"
  ],
  "npcAgreementLines": [
    "We stand with you!",
    "The flock fights on!",
    "You’ve got our backs!",
    "We trust you in the storm!"
  ],
  "battleScenarios": [
    "Feral spirits gather inside the old chapel.",
    "The horde prowls through the flooded basements.",
    "Unholy sirens scream at the altar doors.",
    "Shadows ripple beneath the stained glass windows."
  ],
  "bossBattleThemes": [
    "Hear the chorus of the fallen as you confront the priest of decay.",
    "The floor trembles like a drumroll before the final sermon.",
    "A choir of banshees drowns the bells, leaving only your heartbeat as the tempo."
  ],
  "hordeClearLines": [
    "Kingdoms rise when this horde falls.",
    "No church bells ring for those summoned by darkness.",
    "Breathe easy—God’s porch is safe for now.",
    "This sacrifice keeps the flock from the abyss."
  ]
};
  const ns = global.BattlechurchLevelData || (global.BattlechurchLevelData = {});
  Object.assign(ns, DATA);
})(typeof window !== "undefined" ? window : globalThis);
