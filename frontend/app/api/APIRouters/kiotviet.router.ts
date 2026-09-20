export const kiotviet = {
  value: '/integrations/kiotviet',

  // Main KiotViet endpoints
  accessToken: {
    value: '/integrations/kiotviet/access-token',
  },
  config: {
    value: '/integrations/kiotviet/config',
    regenerateApiKey: {
      value: '/integrations/kiotviet/config/regenerate-api-key',
    },
    requestApiKeyOtp: {
      value: '/integrations/kiotviet/config/request-api-key-otp',
    },
    confirmApiKeyRetrieval: {
      value: '/integrations/kiotviet/config/confirm-api-key-retrieval',
    },
    toggleStatus: {
      value: '/integrations/kiotviet/config/toggle-status',
    },
    syncSettings: {
      value: '/integrations/kiotviet/config/sync-settings',
    },
    fieldMappings: {
      value: '/integrations/kiotviet/config/field-mappings',
    },
  },
  validateApiKey: {
    value: '/integrations/kiotviet/validate-api-key',
  },
  apiKeyInfo: {
    value: '/integrations/kiotviet/api-key-info',
  },

  // Authentication endpoints
  auth: {
    value: '/integrations/kiotviet/auth',
    accessToken: {
      value: '/integrations/kiotviet/auth/access-token',
    },
    config: {
      value: '/integrations/kiotviet/auth/config',
    },
    validateApiKey: {
      value: '/integrations/kiotviet/auth/validate-api-key',
    },
    apiKeyInfo: {
      value: '/integrations/kiotviet/auth/api-key-info',
    },
  },

  // Product endpoints
  products: {
    value: '/integrations/kiotviet/products',
    productId: {
      value: (productId: string) =>
        `/integrations/kiotviet/products/${productId}`,
    },
    search: {
      value: '/integrations/kiotviet/products/search',
    },
    cache: {
      clear: {
        value: '/integrations/kiotviet/products/cache/clear',
      },
    },
  },

  // Category endpoints
  categories: {
    value: '/integrations/kiotviet/categories',
    categoryId: {
      value: (categoryId: string | number) =>
        `/integrations/kiotviet/categories/${categoryId}`,
    },
  },

  // Customer endpoints
  customers: {
    value: '/integrations/kiotviet/customers',
    customerId: {
      value: (customerId: string | number) =>
        `/integrations/kiotviet/customers/${customerId}`,
    },
    code: {
      value: (code: string) => `/integrations/kiotviet/customers/code/${code}`,
    },
    groups: {
      value: '/integrations/kiotviet/customers/groups',
    },
  },

  // Order endpoints
  orders: {
    value: '/integrations/kiotviet/orders',
    orderId: {
      value: (orderId: string | number) =>
        `/integrations/kiotviet/orders/${orderId}`,
    },
    code: {
      value: (code: string) => `/integrations/kiotviet/orders/code/${code}`,
    },
    suppliers: {
      value: '/integrations/kiotviet/orders/suppliers',
    },
  },

  // Invoice endpoints
  invoices: {
    value: '/integrations/kiotviet/invoices',
    invoiceId: {
      value: (invoiceId: string | number) =>
        `/integrations/kiotviet/invoices/${invoiceId}`,
    },
    code: {
      value: (code: string) => `/integrations/kiotviet/invoices/code/${code}`,
    },
  },

  // Branch endpoints
  branches: {
    value: '/integrations/kiotviet/branches',
    branchId: {
      value: (branchId: string | number) =>
        `/integrations/kiotviet/branches/${branchId}`,
    },
  },

  // Supplier endpoints
  suppliers: {
    value: '/integrations/kiotviet/suppliers',
    supplierId: {
      value: (supplierId: string | number) =>
        `/integrations/kiotviet/suppliers/${supplierId}`,
    },
  },

  // User endpoints
  users: {
    value: '/integrations/kiotviet/users',
    userId: {
      value: (userId: string | number) =>
        `/integrations/kiotviet/users/${userId}`,
    },
  },

  // Location endpoints
  locations: {
    value: '/integrations/kiotviet/locations',
    locationId: {
      value: (locationId: string | number) =>
        `/integrations/kiotviet/locations/${locationId}`,
    },
  },

  // Bank account endpoints
  bankAccounts: {
    value: '/integrations/kiotviet/bankaccounts',
    bankAccountId: {
      value: (bankAccountId: string | number) =>
        `/integrations/kiotviet/bankaccounts/${bankAccountId}`,
    },
  },

  // Purchase order endpoints
  purchaseOrders: {
    value: '/integrations/kiotviet/purchaseorders',
    purchaseOrderId: {
      value: (purchaseOrderId: string | number) =>
        `/integrations/kiotviet/purchaseorders/${purchaseOrderId}`,
    },
  },

  // Return order endpoints
  returns: {
    value: '/integrations/kiotviet/returns',
    returnId: {
      value: (returnId: string | number) =>
        `/integrations/kiotviet/returns/${returnId}`,
    },
  },

  // Transfer endpoints
  transfers: {
    value: '/integrations/kiotviet/transfers',
    transferId: {
      value: (transferId: string | number) =>
        `/integrations/kiotviet/transfers/${transferId}`,
    },
  },

  // Order supplier endpoints
  orderSuppliers: {
    value: '/integrations/kiotviet/ordersuppliers',
    orderSupplierId: {
      value: (orderSupplierId: string | number) =>
        `/integrations/kiotviet/ordersuppliers/${orderSupplierId}`,
    },
  },

  // Price book endpoints
  priceBooks: {
    value: '/integrations/kiotviet/pricebooks',
    priceBookId: {
      value: (priceBookId: string | number) =>
        `/integrations/kiotviet/pricebooks/${priceBookId}`,
    },
  },

  // Surcharge endpoints
  surcharges: {
    value: '/integrations/kiotviet/surcharges',
    surchargeId: {
      value: (surchargeId: string | number) =>
        `/integrations/kiotviet/surcharges/${surchargeId}`,
    },
  },

  // Voucher endpoints
  vouchers: {
    value: '/integrations/kiotviet/vouchers',
    voucherId: {
      value: (voucherId: string | number) =>
        `/integrations/kiotviet/vouchers/${voucherId}`,
    },
  },

  // Webhook endpoints
  webhooks: {
    value: '/integrations/kiotviet/webhooks',
    webhookId: {
      value: (webhookId: string | number) =>
        `/integrations/kiotviet/webhooks/${webhookId}`,
    },
  },

  // Sale channel endpoints
  saleChannels: {
    value: '/integrations/kiotviet/salechannels',
    saleChannelId: {
      value: (saleChannelId: string | number) =>
        `/integrations/kiotviet/salechannels/${saleChannelId}`,
    },
  },

  // Cash flow endpoints
  cashFlow: {
    value: '/integrations/kiotviet/cashflow',
    cashFlowId: {
      value: (cashFlowId: string | number) =>
        `/integrations/kiotviet/cashflow/${cashFlowId}`,
    },
  },

  // Store settings endpoints
  storeSettings: {
    value: '/integrations/kiotviet/storesettings',
    storeSettingId: {
      value: (storeSettingId: string | number) =>
        `/integrations/kiotviet/storesettings/${storeSettingId}`,
    },
  },

  // Trademark endpoints
  trademarks: {
    value: '/integrations/kiotviet/trademarks',
    trademarkId: {
      value: (trademarkId: string | number) =>
        `/integrations/kiotviet/trademarks/${trademarkId}`,
    },
  },

  // Mapping endpoints
  mapping: {
    value: '/integrations/kiotviet/mapping',
    products: {
      value: '/integrations/kiotviet/mapping/products',
      syncAnalysis: {
        value: '/integrations/kiotviet/mapping/products/sync-analysis',
      },
      statsOnly: {
        value: '/integrations/kiotviet/mapping/products/stats-only',
      },
    },
  },
};
