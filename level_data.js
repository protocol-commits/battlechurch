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
        "slime": {
          "health": 100,
          "speed": 25
        },
        "archer": {
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
        "swordsman",
        "skeletonArcher",
        "armoredSkeleton",
        "greatswordSkeleton",
        "orc",
        "eliteOrc",
        "armoredOrc",
        "armoredAxeman",
        "skeleton",
        "miniSkeletonArcher"
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
                        "enemy": "miniDemonTormentor",
                        "count": 1
                      },
                      {
                        "enemy": "slime",
                        "count": 1
                      },
                      {
                        "enemy": "miniImp",
                        "count": 20
                      },
                      {
                        "enemy": "miniImpLevel3",
                        "count": 3
                      },
                      {
                        "enemy": "miniImpLevel2",
                        "count": 20
                      }
                    ],
                    "weights": {
                      "miniImp": 50,
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
                      "miniImpLevel2": 50,
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
                      "miniDemonFireKeeper": 0,
                      "miniImpLevel3": 0
                    },
                    "mode": "explicit",
                    "delays": {
                      "miniImpLevel2": 0,
                      "miniFireImp": 11,
                      "slime": 10,
                      "skeleton": 15
                    },
                    "delaysWeighted": {
                      "miniImpLevel2": 0,
                      "slime": 0
                    },
                    "delaysExplicit": {
                      "slime": 0,
                      "miniImp": 7,
                      "orc": 0,
                      "eliteOrc": 0,
                      "miniDemoness": 8,
                      "miniImpLevel2": 5,
                      "skeleton": 0,
                      "miniImpLevel3": 7
                    },
                    "allKill": true,
                    "duration": 15
                  },
                  {
                    "index": 2,
                    "entries": [
                      {
                        "enemy": "miniDemonTormentor",
                        "count": 1
                      },
                      {
                        "enemy": "miniImp",
                        "count": 20
                      },
                      {
                        "enemy": "miniImpLevel3",
                        "count": 20
                      }
                    ],
                    "weights": {
                      "slime": 0,
                      "skeleton": 0,
                      "archer": 0,
                      "miniImp": 50,
                      "miniImpLevel2": 0,
                      "miniFireImp": 10,
                      "armoredSkeleton": 0,
                      "greatswordSkeleton": 0,
                      "orc": 0,
                      "miniImpLevel3": 50
                    },
                    "mode": "explicit",
                    "allKill": true,
                    "duration": 10,
                    "delaysWeighted": {},
                    "delaysExplicit": {
                      "miniImp": 7,
                      "miniImpLevel3": 10
                    }
                  },
                  {
                    "index": 3,
                    "entries": [
                      {
                        "enemy": "miniDemonTormentor",
                        "count": 1
                      },
                      {
                        "enemy": "miniHighDemon",
                        "count": 1
                      },
                      {
                        "enemy": "miniImp",
                        "count": 40
                      }
                    ],
                    "weights": {
                      "slime": 0,
                      "skeleton": 0,
                      "archer": 0,
                      "miniImp": 80,
                      "miniImpLevel2": 0,
                      "miniFireImp": 10,
                      "armoredSkeleton": 0,
                      "greatswordSkeleton": 0,
                      "orc": 0
                    },
                    "delaysWeighted": {},
                    "delaysExplicit": {
                      "miniImp": 7
                    },
                    "allKill": true,
                    "duration": 10,
                    "mode": "explicit"
                  },
                  {
                    "index": 4,
                    "entries": [
                      {
                        "enemy": "miniDemonTormentor",
                        "count": 1
                      },
                      {
                        "enemy": "miniHighDemon",
                        "count": 1
                      },
                      {
                        "enemy": "miniImp",
                        "count": 60
                      }
                    ],
                    "weights": {
                      "slime": 0,
                      "skeleton": 0,
                      "archer": 0,
                      "miniImp": 80,
                      "miniImpLevel2": 0,
                      "miniFireImp": 10,
                      "armoredSkeleton": 0,
                      "greatswordSkeleton": 0,
                      "orc": 0
                    },
                    "delaysWeighted": {},
                    "delaysExplicit": {
                      "miniImp": 7
                    },
                    "allKill": false,
                    "duration": 10
                  },
                  {
                    "index": 5,
                    "entries": [
                      {
                        "enemy": "miniDemonTormentor",
                        "count": 1
                      },
                      {
                        "enemy": "miniHighDemon",
                        "count": 1
                      },
                      {
                        "enemy": "miniImp",
                        "count": 80
                      }
                    ],
                    "weights": {
                      "slime": 0,
                      "skeleton": 0,
                      "archer": 0,
                      "miniImp": 80,
                      "miniImpLevel2": 0,
                      "miniFireImp": 10,
                      "armoredSkeleton": 0,
                      "greatswordSkeleton": 0,
                      "orc": 0
                    },
                    "delaysWeighted": {},
                    "delaysExplicit": {
                      "miniImp": 7
                    },
                    "allKill": false,
                    "duration": 10
                  },
                  {
                    "index": 6,
                    "entries": [
                      {
                        "enemy": "miniImpLevel2",
                        "count": 0
                      },
                      {
                        "enemy": "miniDemonLord",
                        "count": 1
                      },
                      {
                        "enemy": "miniImp",
                        "count": 100
                      },
                      {
                        "enemy": "miniFireImp",
                        "count": 5
                      }
                    ],
                    "weights": {
                      "slime": 1,
                      "skeleton": 1,
                      "archer": 1,
                      "miniImp": 90,
                      "miniImpLevel2": 0,
                      "miniFireImp": 10
                    },
                    "delaysWeighted": {},
                    "delaysExplicit": {
                      "miniImp": 8,
                      "miniImpLevel2": 0,
                      "miniDemonLord": 9,
                      "miniHighDemon": 10,
                      "miniFireImp": 5
                    },
                    "allKill": true,
                    "duration": 10
                  }
                ],
                "hordesPerBattle": 6
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
                    },
                    "allKill": false,
                    "duration": 10,
                    "delaysWeighted": {},
                    "delaysExplicit": {}
                  },
                  {
                    "index": 2,
                    "entries": [],
                    "weights": {}
                  },
                  {
                    "index": 3,
                    "entries": [],
                    "weights": {},
                    "delaysWeighted": {},
                    "delaysExplicit": {},
                    "allKill": false,
                    "duration": 10
                  },
                  {
                    "index": 4,
                    "entries": [],
                    "weights": {},
                    "delaysWeighted": {},
                    "delaysExplicit": {},
                    "allKill": false,
                    "duration": 10
                  },
                  {
                    "index": 5,
                    "entries": [],
                    "weights": {},
                    "delaysWeighted": {},
                    "delaysExplicit": {},
                    "allKill": false,
                    "duration": 10
                  },
                  {
                    "index": 6,
                    "entries": [],
                    "weights": {},
                    "delaysWeighted": {},
                    "delaysExplicit": {},
                    "allKill": true,
                    "duration": 10
                  }
                ]
              },
              {
                "index": 3,
                "hordes": [
                  {
                    "index": 1,
                    "entries": [],
                    "weights": {},
                    "delaysWeighted": {},
                    "delaysExplicit": {},
                    "allKill": false,
                    "duration": 10
                  },
                  {
                    "index": 2,
                    "entries": [],
                    "weights": {},
                    "delaysWeighted": {},
                    "delaysExplicit": {},
                    "allKill": false,
                    "duration": 10
                  },
                  {
                    "index": 3,
                    "entries": [],
                    "weights": {},
                    "delaysWeighted": {},
                    "delaysExplicit": {},
                    "allKill": false,
                    "duration": 10
                  },
                  {
                    "index": 4,
                    "entries": [],
                    "weights": {},
                    "delaysWeighted": {},
                    "delaysExplicit": {},
                    "allKill": false,
                    "duration": 10
                  },
                  {
                    "index": 5,
                    "entries": [],
                    "weights": {},
                    "delaysWeighted": {},
                    "delaysExplicit": {},
                    "allKill": false,
                    "duration": 10
                  },
                  {
                    "index": 6,
                    "entries": [],
                    "weights": {},
                    "delaysWeighted": {},
                    "delaysExplicit": {},
                    "allKill": true,
                    "duration": 10
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
                    "entries": [
                      {
                        "enemy": "miniDemonTormentor",
                        "count": 1
                      }
                    ],
                    "weights": {
                      "miniImp": 80,
                      "miniImpLevel2": 0,
                      "miniFireImp": 10
                    },
                    "allKill": false,
                    "duration": 10,
                    "delaysWeighted": {},
                    "delaysExplicit": {
                      "slime": 5,
                      "miniDemonTormentor": 5
                    }
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
                      "miniImp": 80,
                      "miniImpLevel2": 0,
                      "miniFireImp": 10
                    },
                    "delaysWeighted": {},
                    "delaysExplicit": {
                      "slime": 5,
                      "miniDemonTormentor": 5
                    },
                    "allKill": false,
                    "duration": 10
                  },
                  {
                    "index": 3,
                    "entries": [
                      {
                        "enemy": "miniDemonTormentor",
                        "count": 1
                      }
                    ],
                    "weights": {
                      "miniImp": 80,
                      "miniImpLevel2": 0,
                      "miniFireImp": 10
                    },
                    "delaysWeighted": {},
                    "delaysExplicit": {
                      "slime": 5,
                      "miniDemonTormentor": 5
                    },
                    "allKill": false,
                    "duration": 10
                  },
                  {
                    "index": 4,
                    "entries": [
                      {
                        "enemy": "miniDemonTormentor",
                        "count": 1
                      }
                    ],
                    "weights": {
                      "miniImp": 80,
                      "miniImpLevel2": 0,
                      "miniFireImp": 10
                    },
                    "delaysWeighted": {},
                    "delaysExplicit": {
                      "slime": 5,
                      "miniDemonTormentor": 5
                    },
                    "allKill": false,
                    "duration": 10
                  },
                  {
                    "index": 5,
                    "entries": [
                      {
                        "enemy": "miniDemonTormentor",
                        "count": 1
                      }
                    ],
                    "weights": {
                      "miniImp": 80,
                      "miniImpLevel2": 0,
                      "miniFireImp": 10
                    },
                    "delaysWeighted": {},
                    "delaysExplicit": {
                      "slime": 5,
                      "miniDemonTormentor": 5
                    },
                    "allKill": false,
                    "duration": 10
                  },
                  {
                    "index": 6,
                    "entries": [
                      {
                        "enemy": "miniDemonTormentor",
                        "count": 1
                      }
                    ],
                    "weights": {
                      "miniImp": 80,
                      "miniImpLevel2": 0,
                      "miniFireImp": 10
                    },
                    "delaysWeighted": {},
                    "delaysExplicit": {
                      "slime": 5,
                      "miniDemonTormentor": 5
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
                    "entries": [
                      {
                        "enemy": "miniDemonTormentor",
                        "count": 1
                      }
                    ],
                    "weights": {
                      "miniImp": 80,
                      "miniImpLevel2": 0,
                      "miniFireImp": 10
                    },
                    "delaysWeighted": {},
                    "delaysExplicit": {
                      "slime": 5,
                      "miniDemonTormentor": 5
                    },
                    "allKill": false,
                    "duration": 10
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
                      "miniImp": 80,
                      "miniImpLevel2": 0,
                      "miniFireImp": 10
                    },
                    "delaysWeighted": {},
                    "delaysExplicit": {
                      "slime": 5,
                      "miniDemonTormentor": 5
                    },
                    "allKill": false,
                    "duration": 10
                  },
                  {
                    "index": 3,
                    "entries": [
                      {
                        "enemy": "miniDemonTormentor",
                        "count": 1
                      }
                    ],
                    "weights": {
                      "miniImp": 80,
                      "miniImpLevel2": 0,
                      "miniFireImp": 10
                    },
                    "delaysWeighted": {},
                    "delaysExplicit": {
                      "slime": 5,
                      "miniDemonTormentor": 5
                    },
                    "allKill": false,
                    "duration": 10
                  },
                  {
                    "index": 4,
                    "entries": [],
                    "weights": {},
                    "delaysWeighted": {},
                    "delaysExplicit": {},
                    "allKill": false,
                    "duration": 10
                  },
                  {
                    "index": 5,
                    "entries": [
                      {
                        "enemy": "miniDemonTormentor",
                        "count": 1
                      }
                    ],
                    "weights": {
                      "miniImp": 80,
                      "miniImpLevel2": 0,
                      "miniFireImp": 10
                    },
                    "delaysWeighted": {},
                    "delaysExplicit": {
                      "slime": 5,
                      "miniDemonTormentor": 5
                    },
                    "allKill": false,
                    "duration": 10
                  },
                  {
                    "index": 6,
                    "entries": [
                      {
                        "enemy": "miniDemonTormentor",
                        "count": 1
                      }
                    ],
                    "weights": {
                      "miniImp": 80,
                      "miniImpLevel2": 0,
                      "miniFireImp": 10
                    },
                    "delaysWeighted": {},
                    "delaysExplicit": {
                      "slime": 5,
                      "miniDemonTormentor": 5
                    },
                    "allKill": true,
                    "duration": 10
                  }
                ]
              },
              {
                "index": 3,
                "hordes": [
                  {
                    "index": 1,
                    "entries": [
                      {
                        "enemy": "miniDemonTormentor",
                        "count": 1
                      }
                    ],
                    "weights": {
                      "miniImp": 80,
                      "miniImpLevel2": 0,
                      "miniFireImp": 10
                    },
                    "delaysWeighted": {},
                    "delaysExplicit": {
                      "slime": 5,
                      "miniDemonTormentor": 5
                    },
                    "allKill": false,
                    "duration": 10
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
                      "miniImp": 80,
                      "miniImpLevel2": 0,
                      "miniFireImp": 10
                    },
                    "delaysWeighted": {},
                    "delaysExplicit": {
                      "slime": 5,
                      "miniDemonTormentor": 5
                    },
                    "allKill": false,
                    "duration": 10
                  },
                  {
                    "index": 3,
                    "entries": [
                      {
                        "enemy": "miniDemonTormentor",
                        "count": 1
                      }
                    ],
                    "weights": {
                      "miniImp": 80,
                      "miniImpLevel2": 0,
                      "miniFireImp": 10
                    },
                    "delaysWeighted": {},
                    "delaysExplicit": {
                      "slime": 5,
                      "miniDemonTormentor": 5
                    },
                    "allKill": false,
                    "duration": 10
                  },
                  {
                    "index": 4,
                    "entries": [
                      {
                        "enemy": "miniDemonTormentor",
                        "count": 1
                      }
                    ],
                    "weights": {
                      "miniImp": 80,
                      "miniImpLevel2": 0,
                      "miniFireImp": 10
                    },
                    "delaysWeighted": {},
                    "delaysExplicit": {
                      "slime": 5,
                      "miniDemonTormentor": 5
                    },
                    "allKill": false,
                    "duration": 10
                  },
                  {
                    "index": 5,
                    "entries": [
                      {
                        "enemy": "miniDemonTormentor",
                        "count": 1
                      }
                    ],
                    "weights": {
                      "miniImp": 80,
                      "miniImpLevel2": 0,
                      "miniFireImp": 10
                    },
                    "delaysWeighted": {},
                    "delaysExplicit": {
                      "slime": 5,
                      "miniDemonTormentor": 5
                    },
                    "allKill": false,
                    "duration": 10
                  },
                  {
                    "index": 6,
                    "entries": [
                      {
                        "enemy": "miniDemonTormentor",
                        "count": 1
                      }
                    ],
                    "weights": {
                      "miniImp": 80,
                      "miniImpLevel2": 0,
                      "miniFireImp": 10
                    },
                    "delaysWeighted": {},
                    "delaysExplicit": {
                      "slime": 5,
                      "miniDemonTormentor": 5
                    },
                    "allKill": true,
                    "duration": 10
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
  }
};
  const ns = global.BattlechurchLevelData || (global.BattlechurchLevelData = {});
  Object.assign(ns, DATA);
})(typeof window !== "undefined" ? window : globalThis);
