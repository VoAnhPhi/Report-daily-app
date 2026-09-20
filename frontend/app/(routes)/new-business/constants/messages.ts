// Centralized Vietnamese strings for the /new-business feature.
// Use these instead of hardcoding toast/UI strings so all messages stay consistent.
// Status labels live in `@/types/business-form.type` (STATUS_LABEL_VI).

export const BUSINESS_FORM_SUCCESS = {
  create: 'Đã gửi đăng ký thành công!',
  update: 'Đã cập nhật form thành công!',
  resubmit: 'Đã gửi lại đăng ký thành công!',
  delete: 'Đã xóa form đăng ký.',
  deleteAndMstAvailable: 'Đã xóa form. MST hiện khả dụng.',
  uploadFile: 'Tải lên thành công',
  uploadImage: 'Tải ảnh lên thành công',
  captureFile: 'Chụp & tải lên thành công',
  captureImage: 'Chụp & tải ảnh thành công',
} as const;

export const BUSINESS_FORM_ERROR = {
  create: 'Gửi đăng ký thất bại. Vui lòng thử lại.',
  update: 'Cập nhật thất bại. Vui lòng thử lại.',
  resubmit: 'Gửi lại thất bại. Vui lòng thử lại.',
  delete: 'Xóa thất bại. Vui lòng thử lại.',
  upload: 'Tải lên thất bại. Vui lòng thử lại.',
  invalidFileType: 'Vui lòng chọn file PDF hoặc ảnh',
  invalidImageType: 'Vui lòng chọn file ảnh',
  heicConversion: 'Không thể chuyển HEIC sang JPEG',
  fetchList: 'Có lỗi khi tải danh sách. Vui lòng thử lại.',
  notFound: 'Không tìm thấy form hoặc bạn không có quyền truy cập.',
  formIdMissing: 'Không tìm thấy ID form để xóa',
  companyNotFound: 'Công ty không tồn tại. Vui lòng nhập thông tin thủ công.',
  lookupUnavailable:
    'Hệ thống tra cứu tạm thời không khả dụng. Vui lòng nhập thông tin thủ công.',
} as const;

export const BUSINESS_FORM_LABELS = {
  submit: 'Gửi đăng ký',
  resubmit: 'Gửi lại đăng ký',
  update: 'Cập nhật',
} as const;

export const BUSINESS_FORM_HINTS = {
  mstLocked:
    'Không thể thay đổi MST, vui lòng tạo mới nếu cần thay đổi MST',
  mstNeeded:
    'Nhập MST để tự động điền tên công ty và địa chỉ',
  lookupSuccess: 'Đã tìm thấy thông tin công ty',
  lookupFallback:
    'Hiện tại không thể tra cứu thông tin công ty. Vui lòng nhập tên công ty và địa chỉ thủ công',
} as const;

export type BusinessFormSuccessKey = keyof typeof BUSINESS_FORM_SUCCESS;
export type BusinessFormErrorKey = keyof typeof BUSINESS_FORM_ERROR;
export type BusinessFormLabelKey = keyof typeof BUSINESS_FORM_LABELS;
export type BusinessFormHintKey = keyof typeof BUSINESS_FORM_HINTS;
