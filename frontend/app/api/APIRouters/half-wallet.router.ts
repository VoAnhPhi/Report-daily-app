export const halfWallet = {
  wallets: {
    mine: { value: '/half/wallets/me' },
    submit: { value: '/half/wallets' },
    confirmReceipt: { value: (id: string) => `/half/wallets/${id}/confirm-receipt` },
    declineReceipt: { value: (id: string) => `/half/wallets/${id}/decline-receipt` },
  },
  transfers: {
    mine: { value: '/half/transfers/me' },
    create: { value: '/half/transfers' },
  },
};
