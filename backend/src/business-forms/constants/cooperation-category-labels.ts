import { CooperationCategory } from '@prisma/client';

export const COOPERATION_CATEGORY_LABELS: Record<CooperationCategory, string> =
  {
    [CooperationCategory.consultation]: 'Tư vấn',
    [CooperationCategory.sales_partnership]: 'Liên kết bán hàng',
    [CooperationCategory.distribution]: 'Phân phối / Đại lý',
    [CooperationCategory.oem_manufacturing]: 'Sản xuất / OEM/ODM',
    [CooperationCategory.brand_collaboration]: 'Hợp tác thương hiệu',
    [CooperationCategory.marketing_advertising]: 'Marketing & Quảng cáo',
    [CooperationCategory.solar_panel_installation]: 'Lắp đặt điện mặt trời',
    [CooperationCategory.personal_work]: 'Công việc cá nhân',
    [CooperationCategory.other]: 'Khác',
  };

export const COOPERATION_CATEGORIES: {
  value: CooperationCategory;
  label: string;
}[] = (Object.keys(COOPERATION_CATEGORY_LABELS) as CooperationCategory[]).map(
  (value) => ({ value, label: COOPERATION_CATEGORY_LABELS[value] }),
);
