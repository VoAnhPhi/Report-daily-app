export const gamification = {
  dashboard: {
    value: '/gamification/dashboard',
  },
  stats: {
    value: '/gamification/stats',
  },
  points: {
    history: {
      value: '/gamification/points/history',
    },
    spend: {
      value: '/gamification/points/spend',
    },
  },
  tasks: {
    value: '/gamification/tasks',
    available: {
      value: '/gamification/tasks/available',
    },
    byId: (id: string) => ({
      value: `/gamification/tasks/${id}`,
      start: {
        value: `/gamification/tasks/${id}/start`,
      },
      claim: {
        value: `/gamification/tasks/${id}/claim`,
      },
      progress: {
        value: `/gamification/tasks/${id}/progress`,
      },
    }),
  },
  achievements: {
    value: '/gamification/achievements',
    byId: (id: string) => ({
      value: `/gamification/achievements/${id}`,
      pin: {
        value: `/gamification/achievements/${id}/pin`,
      },
      unpin: {
        value: `/gamification/achievements/${id}/unpin`,
      },
    }),
  },
  leaderboard: {
    byType: (type: string) => ({
      value: `/gamification/leaderboard/${type}`,
      myRank: {
        value: `/gamification/leaderboard/${type}/my-rank`,
      },
    }),
  },
  streaks: {
    value: '/gamification/streaks',
    freeze: (type: string) => ({
      value: `/gamification/streaks/${type}/freeze`,
    }),
  },
  activity: {
    value: '/gamification/activity',
  },
  shop: {
    items: {
      value: '/gamification/shop/items',
      byId: (id: string) => ({
        value: `/gamification/shop/items/${id}`,
        purchase: {
          value: `/gamification/shop/items/${id}/purchase`,
        },
      }),
    },
    purchases: {
      value: '/gamification/shop/purchases',
    },
    inventory: {
      value: '/gamification/shop/inventory',
      equip: (itemId: string) => ({
        value: `/gamification/shop/inventory/${itemId}/equip`,
      }),
      use: (itemId: string) => ({
        value: `/gamification/shop/inventory/${itemId}/use`,
      }),
    },
  },
  titles: {
    value: '/gamification/titles',
    myTitles: {
      value: '/gamification/titles/my-titles',
    },
    equipped: {
      value: '/gamification/titles/equipped',
    },
    byId: (id: string) => ({
      value: `/gamification/titles/${id}`,
      purchase: {
        value: `/gamification/titles/${id}/purchase`,
      },
      equip: {
        value: `/gamification/titles/${id}/equip`,
      },
      checkUnlock: {
        value: `/gamification/titles/${id}/check-unlock`,
      },
    }),
    unequip: {
      value: '/gamification/titles/unequip',
    },
  },
  referrals: {
    myCode: {
      value: '/gamification/referrals/my-code',
    },
    stats: {
      value: '/gamification/referrals/stats',
    },
    validate: (code: string) => ({
      value: `/gamification/referrals/validate/${code}`,
    }),
    complete: {
      value: '/gamification/referrals/complete',
    },
  },
  challenges: {
    value: '/gamification/challenges',
    active: {
      value: '/gamification/challenges/active',
    },
    myChallenges: {
      value: '/gamification/challenges/my-challenges',
    },
    byId: (id: string) => ({
      value: `/gamification/challenges/${id}`,
      join: {
        value: `/gamification/challenges/${id}/join`,
      },
      leaderboard: {
        value: `/gamification/challenges/${id}/leaderboard`,
      },
      claimReward: {
        value: `/gamification/challenges/${id}/claim-reward`,
      },
      updateProgress: {
        value: `/gamification/challenges/${id}/update-progress`,
      },
    }),
  },
  seasons: {
    value: '/gamification/seasons',
    current: {
      value: '/gamification/seasons/current',
    },
    archive: {
      value: '/gamification/seasons/archive',
    },
    byId: (id: string) => ({
      value: `/gamification/seasons/${id}`,
      leaderboard: {
        value: `/gamification/seasons/${id}/leaderboard`,
      },
      myRank: {
        value: `/gamification/seasons/${id}/my-rank`,
      },
    }),
  },
};
