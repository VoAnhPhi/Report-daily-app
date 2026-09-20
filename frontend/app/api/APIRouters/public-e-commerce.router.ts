export const public_ecommerce = {
  products: {
    value: '/public/products',
  },
  businesses: {
    value: '/public/businesses',
  },
  categories: {
    value: '/public/categories',
  },
  cart: {
    add: '/public/cart/add',
    update: '/public/cart/update',
    remove: '/public/cart/remove',
    removeMultiple: '/public/cart/remove-multiple',
    get: '/public/cart',
    count: '/public/cart/count',
    validateGuestTransfer: (sessionId: string) =>
      `/public/cart/validate-guest-transfer/${sessionId}`,
  },
  cartGuest: {
    add: '/public/cart/guest/items',
    update: '/public/cart/guest/update',
    remove: '/public/cart/guest/remove',
    get: '/public/cart/guest',
    count: '/public/cart/guest/count',
  },
  checkout: {
    createOrder: '/e-commerce/checkout/create-order',
    orders: '/e-commerce/checkout/orders',
    orderById: (id: string) => `/e-commerce/checkout/orders/${id}`,
    orderByCode: (code: string) => `/e-commerce/checkout/orders/code/${code}`,
    pickupOptions: '/e-commerce/checkout/pickup-options',
    selectWarehouse: '/e-commerce/checkout/select-warehouse',
    calculateShippingFee: '/services/shipment/fee',
  },
  public: {
    orders: {
      guest: '/public/orders/guest',
    },
  },
  publicOrders: {
    base: '/public/orders',
    list: '/public/orders',
    summary: '/public/orders/summary',
    countByStatus: '/public/orders/counts/status',
    countByPaymentStatus: '/public/orders/counts/payment-status',
    getById: (id: string) => `/public/orders/${id}`,
    getByCode: (code: string) => `/public/orders/code/${code}`,
    getItems: (id: string) => `/public/orders/${id}/items`,
    getPayments: (id: string) => `/public/orders/${id}/payments`,
    getDelivery: (id: string) => `/public/orders/${id}/delivery`,
    getTimeline: (id: string) => `/public/orders/${id}/timeline`,
    getDeliveryLogs: (id: string) => `/public/orders/${id}/delivery-logs`,
    getDeliveryWithTimeline: (id: string) =>
      `/public/orders/${id}/delivery-with-timeline`,
    reorderPreview: (id: string) => `/public/orders/${id}/reorder-preview`,
    cancel: (id: string) => `/public/orders/${id}/cancel`,
    requestVatInvoice: (id: string) =>
      `/public/orders/${id}/request-vat-invoice`,
  },
  payment: {
    status: '/payment/status',
    simulate: '/payment/simulate',
    create: '/payments/create', // This will be handled by the backend directly
    complete: '/payment/complete',
    cancel: '/payment/cancel',
  },
  reviews: {
    create: '/reviews',
    list: '/reviews',
    getById: (id: string) => `/reviews/${id}`,
    getByProduct: (productId: string) => `/reviews/product/${productId}`,
    getProductSummary: (productId: string) =>
      `/reviews/product/${productId}/summary`,
    update: (id: string) => `/reviews/${id}`,
    delete: (id: string) => `/reviews/${id}`,
    like: (id: string) => `/reviews/${id}/like`,
    getOrderStatus: (orderId: string) => `/reviews/order/${orderId}/status`,
  },
  ratings: {
    create: '/ratings',
    createBatch: '/ratings/batch',
    list: '/ratings',
    getById: (id: string) => `/ratings/${id}`,
    getByProduct: (productId: string) => `/ratings/product/${productId}`,
    getProductSummary: (productId: string) =>
      `/ratings/product/${productId}/summary`,
    update: (id: string) => `/ratings/${id}`,
    delete: (id: string) => `/ratings/${id}`,
    like: (id: string) => `/ratings/${id}/like`,
    toggleLike: (id: string) => `/ratings/${id}/toggle-like`,
  },
  returnOrders: {
    value: '/public/return-orders',
    byId: (id: string) => `/public/return-orders/${id}`,
    tracking: (id: string) => `/public/return-orders/${id}/tracking`,
    cancel: (id: string) => `/public/return-orders/${id}/cancel`,
  },
};
