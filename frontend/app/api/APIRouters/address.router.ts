export const address = {
  value: '/address',
  list: {
    value: '/address/list',
  },
  addressId: {
    value: (id: string) => `/address/${id}`,
    default: {
      value: (id: string) => `/address/${id}/set-default`,
    },
  },
  default: {
    value: '/address/default',
  },
};
