export const identity = {
  identity: {
    value: '/identity/mine',
    list: {
      value: '/identity/mine',
    },
    create: {
      value: '/identity', // Endpoint tạo identity mới
    },
    byId: {
      value: (id: string) => `/identity/mine/${id}`,
      primary: {
        value: (id: string) => `/identity/mine/${id}/primary`,
      },
      fullNumber: {
        value: (id: string) => `/identity/mine/${id}/full-number`,
      },
      update: {
        value: (id: string) => `/identity/mine/${id}`,
      },
    },
  },
  invoiceProfile: {
    value: '/invoice-profile',
    list: {
      value: '/invoice-profile',
    },
    byId: {
      value: (id: string) => `/invoice-profile/${id}`,
      default: {
        value: (id: string) => `/invoice-profile/${id}/default`,
      },
    },
  },
};
