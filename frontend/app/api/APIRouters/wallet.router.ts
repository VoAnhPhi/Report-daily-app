export const wallet = {
  referenceBanks: {
    value: '/wallet/reference-banks',
  },
  paymentMethods: {
    value: '/wallet/payment-methods',
    byId: {
      value: (id: string) => `/wallet/payment-methods/${id}`,
      setDefault: {
        value: (id: string) => `/wallet/payment-methods/${id}/set-default`,
      },
    },
  },
};
