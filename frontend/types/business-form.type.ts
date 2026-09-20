export type BusinessFormStatus =
  | 'pending'
  | 'in_review'
  | 'needs_more_info'
  | 'approved'
  | 'rejected';

export const STATUS_LABEL_VI: Record<BusinessFormStatus, string> = {
  pending: 'Chờ duyệt',
  in_review: 'Đang xem xét',
  needs_more_info: 'Cần bổ sung thông tin',
  approved: 'Đã duyệt',
  rejected: 'Đã từ chối',
};

// Nội dung hợp tác — drives which sections of the form are shown.
// Must stay in sync with `CooperationCategory` in
// acta-api/prisma/schema/business-form.prisma.
export type CooperationCategory =
  | 'consultation'
  | 'sales_partnership'
  | 'distribution'
  | 'oem_manufacturing'
  | 'brand_collaboration'
  | 'marketing_advertising'
  | 'personal_work'
  | 'solar_panel_installation'
  | 'other';

export const COOPERATION_CATEGORY_LABEL_VI: Record<CooperationCategory, string> = {
  consultation: 'Tư vấn',
  sales_partnership: 'Liên kết bán hàng',
  distribution: 'Phân phối / Đại lý',
  oem_manufacturing: 'Sản xuất / OEM',
  brand_collaboration: 'Hợp tác thương hiệu',
  marketing_advertising: 'Marketing & Quảng cáo',
  personal_work: 'Công việc cá nhân',
  solar_panel_installation: 'Lắp đặt điện mặt trời',
  other: 'Khác',
};

// ──────────────────────────────────────────────────────────────────────────
// Field-level flags. When admin transitions a form to `needs_more_info` they
// can pin specific fields with a per-field reason. The user UI uses these
// flags to highlight which inputs need editing (with tooltip on desktop /
// drawer on mobile).
// ──────────────────────────────────────────────────────────────────────────

export const BUSINESS_FORM_FLAGGABLE_FIELDS = [
  'companyName',
  'taxCode',
  'address',
  'contactName',
  'contactPhone',
  'description',
  'productInfo',
  'gpkdFileUrl',
  'congBoSpFileUrl',
  'kiemNghiemFileUrl',
  'nhanSpFileUrl',
  'maVachFileUrl',
  'tccsFileUrl',
  'coFileUrl',
  'dangKyNhFileUrl',
  'gmpFileUrl',
  'otherDocFileUrl',
  'products',
  'attachments',
] as const;

export type BusinessFormFlaggableField =
  (typeof BUSINESS_FORM_FLAGGABLE_FIELDS)[number];

export const BUSINESS_FORM_FLAGGABLE_FIELD_LABEL_VI: Record<
  BusinessFormFlaggableField,
  string
> = {
  companyName: 'Tên doanh nghiệp',
  taxCode: 'Mã số thuế (MST)',
  address: 'Địa chỉ',
  contactName: 'Người liên hệ',
  contactPhone: 'SĐT liên hệ',
  description: 'Mô tả nhu cầu',
  productInfo: 'Mô tả sản phẩm / doanh nghiệp',
  gpkdFileUrl: 'Giấy đăng ký kinh doanh (GPKD)',
  congBoSpFileUrl: 'Bản công bố sản phẩm',
  kiemNghiemFileUrl: 'Phiếu kết quả kiểm nghiệm',
  nhanSpFileUrl: 'Nhãn sản phẩm',
  maVachFileUrl: 'Mã số / mã vạch',
  tccsFileUrl: 'Tiêu chuẩn cơ sở (TCCS)',
  coFileUrl: 'Chứng nhận nguồn gốc (C/O)',
  dangKyNhFileUrl: 'Đăng ký nhãn hiệu',
  gmpFileUrl: 'Chứng nhận GMP',
  otherDocFileUrl: 'Tài liệu khác',
  products: 'Danh mục sản phẩm',
  attachments: 'Tài liệu đính kèm',
};

export interface BusinessFormFieldFlag {
  id: string;
  fieldKey: BusinessFormFlaggableField;
  reason: string;
  createdAt: string;
}

// ──────────────────────────────────────────────────────────────────────────
// Progress notes — public-shape entries. Admin UI has a wider shape; the
// social client receives only entries marked `isVisibleToUser=true`, with
// `supplierName` redacted to `null` when admin chose to hide identity.
// ──────────────────────────────────────────────────────────────────────────

export type BusinessFormProgressStatus =
  | 'awaiting_partner_response'
  | 'partner_contacted'
  | 'supplier_contacted'
  | 'general_update';

export const BUSINESS_FORM_PROGRESS_STATUS_LABEL_VI: Record<
  BusinessFormProgressStatus,
  string
> = {
  awaiting_partner_response: 'Đang chờ phản hồi đối tác',
  partner_contacted: 'Đã liên hệ đối tác',
  supplier_contacted: 'Đã liên hệ nhà cung cấp',
  general_update: 'Cập nhật từ ACTA',
};

export interface BusinessFormProgressNote {
  id: string;
  status: BusinessFormProgressStatus;
  note?: string | null;
  imageUrls: string[];
  /**
   * Supplier name. The backend redacts this to `null` when admin chose to
   * anonymize, so the social UI only needs to render it when present.
   */
  supplierName?: string | null;
  createdAt: string;
}

export interface BusinessFormProduct {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
}

export interface BusinessFormAttachment {
  id: string;
  label: string;
  fileUrl: string;
  note?: string | null;
}

export interface BusinessFormReviewer {
  id: string;
  fullName: string;
}

export interface BusinessFormSubmitter {
  id: string;
  fullName: string;
}

export interface BusinessForm {
  id: string;
  userId: string;
  companyName: string;
  taxCode: string;
  isIndividual: boolean;
  address: string;
  contactName: string;
  contactPhone: string;
  description?: string | null;
  productInfo?: string | null;
  gpkdFileUrl?: LegalDocFile[] | null;
  congBoSpFileUrl?: LegalDocFile[] | null;
  kiemNghiemFileUrl?: LegalDocFile[] | null;
  nhanSpFileUrl?: LegalDocFile[] | null;
  maVachFileUrl?: LegalDocFile[] | null;
  tccsFileUrl?: LegalDocFile[] | null;
  coFileUrl?: LegalDocFile[] | null;
  dangKyNhFileUrl?: LegalDocFile[] | null;
  gmpFileUrl?: LegalDocFile[] | null;
  otherDocFileUrl?: LegalDocFile[] | null;
  status: BusinessFormStatus;
  adminNote?: string | null;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  reviewedBy?: BusinessFormReviewer | null;
  submitter?: BusinessFormSubmitter | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  products: BusinessFormProduct[];
  attachments?: BusinessFormAttachment[];
  fieldFlags?: BusinessFormFieldFlag[];
  progressNotes?: BusinessFormProgressNote[];
}

export interface LegalDocFile {
  url: string;
  note?: string;
}

export interface CheckMstAvailableResponse {
  taken: false;
}

export interface CheckMstTakenResponse {
  taken: true;
  existing: {
    id: string;
    companyName: string;
    status: BusinessFormStatus;
    createdAt: string;
    user: { id: string; fullName: string };
  };
}

export type CheckMstResult = CheckMstAvailableResponse | CheckMstTakenResponse;

export type MstLookupReason = 'not_found' | 'unavailable';

export type MstLookupResult =
  | {
      found: true;
      data: {
        id: string;
        name: string;
        internationalName: string;
        address: string;
      };
    }
  | {
      found: false;
      reason: MstLookupReason;
    };

export interface PaginatedBusinessFormsResponse {
  data: BusinessForm[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateBusinessFormProductDto {
  name: string;
  price: number;
  imageUrl?: string;
}

export interface CreateBusinessFormAttachmentDto {
  label: string;
  fileUrl: string;
  note?: string;
}

export interface CreateBusinessFormDto {
  companyName: string;
  taxCode: string;
  isIndividual?: boolean;
  address: string;
  contactName: string;
  contactPhone: string;
  description?: string;
  productInfo?: string;
  gpkdFileUrl?: LegalDocFile[];
  congBoSpFileUrl?: LegalDocFile[];
  kiemNghiemFileUrl?: LegalDocFile[];
  nhanSpFileUrl?: LegalDocFile[];
  maVachFileUrl?: LegalDocFile[];
  tccsFileUrl?: LegalDocFile[];
  coFileUrl?: LegalDocFile[];
  dangKyNhFileUrl?: LegalDocFile[];
  gmpFileUrl?: LegalDocFile[];
  otherDocFileUrl?: LegalDocFile[];
  products?: CreateBusinessFormProductDto[];
  attachments?: CreateBusinessFormAttachmentDto[];
}

export type UpdateBusinessFormDto = Partial<CreateBusinessFormDto>;

export interface GetBusinessFormsQueryDto {
  status?: BusinessFormStatus;
  page?: number;
  limit?: number;
  includeDeleted?: boolean;
  search?: string;
  /** Làm thay: liệt kê đối tác của người được chăm (BE verify quan hệ Baby). */
  onBehalfOfUserId?: string;
}
