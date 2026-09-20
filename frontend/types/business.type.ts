export interface Business {
  id: string;
  kiotVietTradeMarkId?: number | null;
  code?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  slogan?: string | null;
  logo?: string | null;
  banner?: string | null;
  avatar?: string | null;
  source: 'acta' | 'kiotviet';
  type: 'expansion' | 'platform';
  taxCode?: string | null;
  email: string;
  phone: string;
  website?: string | null;
  address?: string | null;
  location?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  rating: number;
  totalRatings: number;
  productCount: number; // tổng sản phẩm (kể cả inactive/không allowsSale)
  followers: number;
  responseRate: number;
  responseTime: string;
  verified: boolean;
  isActive: boolean;
  joinDate: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  products?: BusinessProduct[];
  // Analytics (detail response)
  totalOrders?: number;
  totalUnitsSold?: number;
  totalSalesAmount?: number;
  averageOrderValue?: number;
  totalUniqueCustomers?: number;
  totalReturns?: number;
  returnRate?: number;
  topCustomers?: Array<{
    customerId: string;
    customerName?: string | null;
    ordersCount: number;
  }>;
  repeatCustomerRate?: number;
  avgOrdersPerCustomer?: number;
  // Enhanced customer analytics
  customerAnalytics?: CustomerAnalytics;

  // Commission analytics
  commissionAnalytics?: CommissionAnalytics;
}

export interface CustomerAnalytics {
  topCustomersByRevenue: CustomerDetail[];
  newCustomersCount: number;
  atRiskCustomersCount: number;
  customerSegments: {
    vip: number;
    regular: number;
    casual: number;
    total: number;
  };
  recentCustomers: CustomerDetail[];
}

export interface CustomerDetail {
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  customerAvatar: string | null;
  customerGroup: string | null;
  rewardPoints: number;
  taxCode: string | null;
  source: string;
  ordersCount: number;
  totalSpent: number;
  averageOrderValue: number;
  isRepeatCustomer: boolean;
  daysSinceFirstOrder: number;
  daysSinceLastOrder: number;
  firstOrderDate: string;
  lastOrderDate: string;
}

export interface CommissionAnalytics {
  totalCommissionAmount: number;
  platformCutAmount: number;
  f0CommissionAmount: number; // Reserve fund (20% of available commission)
  f1CommissionAmount: number; // Direct referrer (50% of available commission)
  f2CommissionAmount: number; // Indirect referrer (30% of available commission)
  f0CommissionCount: number;
  f1CommissionCount: number;
  f2CommissionCount: number;
  totalCommissionCount: number;
  categoryBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    categoryGroup: string;
    totalCommissionAmount: number;
    f0Amount: number;
    f1Amount: number;
    f2Amount: number;
  }>;
}

export interface UpdateBusinessData {
  id: string;
  name?: string;
  description?: string;
  slogan?: string;
  logo?: string;
  banner?: string;
  avatar?: string;
  type?: 'expansion' | 'platform';
  taxCode?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  location?: string;
  facebook?: string;
  instagram?: string;
  source?: 'acta' | 'kiotviet';
  verified?: boolean;
  isActive?: boolean;
  kiotVietTradeMarkId?: number;
  code?: string;
  slug?: string;
}

export interface BusinessProduct {
  id: string;
  name: string;
  price: number;
  thumbnail: string;
  ratingAvg?: number;
  category?: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    source: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BusinessListResponse {
  data: Business[];
  pagination: Pagination;
}

export interface BusinessQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  verified?: boolean;
  source?: 'acta' | 'kiotviet';
  type?: 'expansion' | 'platform';
  userId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
