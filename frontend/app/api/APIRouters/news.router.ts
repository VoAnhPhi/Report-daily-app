export const news = {
  value: '/news',
  newsItemId: {
    value: (newsItemId: string) => `/news/${newsItemId}`,
    views: {
      value: (newsItemId: string) => `/news/${newsItemId}/views`,
    },
    like: {
      value: (newsItemId: string) => `/news/${newsItemId}/like`,
    },
    comment: {
      value: (newsItemId: string) => `/news/${newsItemId}/comments`,
      commentId: {
        value: (newsItemId: string, commentId: string) =>
          `/news/${newsItemId}/comments/${commentId}`,
      },
    },
    slug: {
      value: (fullSlug: string) => `/news/slug/${fullSlug}`,
    },
  },
  comment: {
    commentId: {
      value: (commentId: string) => `/news/comments/${commentId}`,
      like: {
        value: (commentId: string) => `/news/comments/${commentId}/like`,
      },
    },
  },
  admin: {
    value: '/news/admin',
  },
};
