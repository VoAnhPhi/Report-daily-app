export const user = {
  value: '/users',
  /** Ứng viên cho ô gợi ý `@`, phân trang bằng con trỏ (20 mỗi lượt). */
  mentionSearch: {
    value: '/users/mention-search',
  },
  userId: {
    value: (userId: string) => `/users/${userId}`,
    referrer: {
      referrerId: {
        requestAction: {
          value: (userId: string, referrerId: string, requestAction: string) =>
            `/users/${userId}/referrer/${referrerId}/${requestAction}`,
        },
      },
    },
    requestAction: {
      value: (userId: string, requestAction: string) =>
        `/users/${userId}/${requestAction}`,
    },
  },
  referenceId: {
    value: (referenceId: string) => `/users/reference/${referenceId}`,
  },
};

export const admin = {
  value: 'users/admin/users',
  userId: {
    value: (userId: string) => `users/admin/users/${userId}`,
    requestAction: {
      value: (userId: string, requestAction: string) =>
        `users/admin/users/${userId}/${requestAction}`,
    },
  },
};
