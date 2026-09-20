export const messages = {
  referrerNotFound: 'Referrer not found or not verified',
  registerSuccess: 'Register successful',
  passwordResetEmailSent: 'Password reset email sent',
  emailAlreadyExists: 'Email already exists',
  phoneNumberAlreadyExists: 'Phone number already exists',
  cccdAlreadyExists:
    'Số CCCD này đã được sử dụng để đăng ký tài khoản khác. Vui lòng kiểm tra lại hoặc liên hệ hỗ trợ nếu bạn chưa từng đăng ký.',
  userNotFound: 'User not found',
  userNotFoundOrNotVerified: 'User not found or not verified',
  userNotVerified: 'User not verified',
  userAlreadyVerified: 'User already verified',
  userAlreadyExists: 'User already exists',
  userNotExists: 'User not exists',
  invalidRefreshToken: 'Invalid refresh token',
  refreshTokenExpired: 'Refresh token expired',
  duplicateDocumentWithSameNameAndCategory:
    'Document with this title already exists in the specified category',
  invalidCredentials: 'Invalid credentials',
  invalidResetToken: 'Invalid or expired reset token',
  invalidToken: 'Invalid token',
  emailSendingFailed: 'Email sending failed',
  passwordResetSuccess: 'Password reset successful',
  passwordResetEmailAlreadySent:
    'Password reset email already sent, please check your email',
  userNotPendingApproval: 'User is not pending approval',
  userNotReferrer: 'User is not referrer',
  invalidRequestAction: 'Invalid request action',
  userNotActive: 'User is not active',
  // Account was deactivated by an admin (or via KYC rejection). Distinct from
  // `userNotActive`, which is reused across forum/news/document gates for any
  // not-yet-active account — do not merge the two.
  accountDeactivated: 'Account is deactivated',
  invalidCurrentPassword: 'Your current password is incorrect.',
  invalidOtp: 'Invalid or expired OTP.',
  passwordChangeSuccess: 'Password changed successfully',
  userNotVerifiedEmailSentAgain:
    'User not verified, email sent again, please check your email',
  userWithSamePhoneNumberAlreadyExists:
    'User with same phone number already exists',
  usernameAndPasswordRequired: 'Username and password are required',
  userActionRequestedSuccessfully: 'User action requested successfully',
  userActionRequestedFailed: 'User action requested failed',
  invalidVerificationToken: 'Invalid verification token',
  expiredVerficationTokenAndResend:
    'Expired verification token, please verify again',
  emailVerifiedSuccessfully: 'Email verified successfully',
  kycNotFound: 'KYC not found',
  systemError: 'System error',

  // Order messages
  orderNotFound: 'Không tìm thấy đơn hàng',
  orderDeliveryNotFound: 'Không tìm thấy thông tin giao hàng',
  orderCustomerNotFound: 'Không tìm thấy thông tin khách hàng',
  orderMustBeConfirmedToStartPacking:
    'Đơn hàng phải ở trạng thái đã xác nhận để bắt đầu đóng gói',
  orderMustBePackingToComplete:
    'Đơn hàng phải ở trạng thái đang đóng gói để hoàn thành',
  orderMustBePackingToInitializeChecklist:
    'Đơn hàng phải ở trạng thái đang đóng gói để khởi tạo checklist',
  orderMustBePackingToSubmitEvidence:
    'Đơn hàng phải ở trạng thái đang đóng gói để gửi bằng chứng',
  orderMustBePackingToFlagException:
    'Đơn hàng phải ở trạng thái đang đóng gói để ghi nhận vấn đề',
  orderMustBePackingCompletedToMarkDelivered:
    'Đơn hàng phải ở trạng thái đóng gói hoàn tất để đánh dấu đã giao',
  orderOnlyWarehousePickupCanMarkDelivered:
    'Chỉ đơn hàng nhận tại kho mới có thể đánh dấu đã giao bằng cách này',
  orderMarkedAsDeliveredSuccessfully: 'Đã đánh dấu giao hàng thành công',
  orderDeliveryAddressUpdatedAndSaved:
    'Cập nhật địa chỉ giao hàng và lưu vào danh sách địa chỉ thành công',
  orderDeliveryAddressUpdated: 'Cập nhật địa chỉ giao hàng thành công',
  orderCannotCancelCurrentStatus:
    'Không thể hủy đơn hàng ở trạng thái hiện tại',
  orderAlreadyCompleted: 'Đơn hàng đã hoàn thành, không thể hủy',
  orderAlreadyRefunded: 'Đơn hàng đã được hoàn tiền, không thể hủy',

  orderPaymentNotCompleted:
    'Không thể chuyển trạng thái đơn hàng. Vui lòng kiểm tra lại hoặc liên hệ hỗ trợ',
  orderMissingInvoiceArtifacts:
    'Không thể chuyển trạng thái đơn hàng. Vui lòng kiểm tra lại trạng thái thanh toán hoặc liên hệ hỗ trợ',
};

/**
 * Single Vietnamese wording for a deactivated account, shared by every auth gate
 * (login, OTP send/verify, refresh, password reset, JWT guard) so the user sees
 * one consistent message no matter which door they knock on.
 */
export const ACCOUNT_DEACTIVATED_VN =
  'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ ACTA để được hỗ trợ.';

/**
 * Câu DUY NHẤT được phép ra tới client cho MỌI lỗi 5xx.
 *
 * ⚠ Là một HẰNG SỐ, và phải giữ nguyên như vậy: cấm mọi nội suy (tên bảng,
 * tên thao tác, câu lỗi gốc, stack). Sự cố 2026-09-03 đi ra tới máy đo qua
 * đúng đường ngược lại — `all-exceptions.filter.ts` chuyển tiếp NGUYÊN VĂN
 * `message` của mọi `Error`, nên `The table public.post_tags does not exist`
 * hiện lên trên dây. Chi tiết kỹ thuật thuộc về NHẬT KÝ máy chủ, không thuộc
 * về thân phản hồi.
 *
 * ⚠ KHÔNG chứa các chuỗi mà frontend đang khớp CHUỖI CON để đoán "phiên hết
 * hạn" (`Unauthorized`, `Invalid token`, `No authentication token found` —
 * xem `acta-social/components/providers/social-provider.tsx:194-199`): trùng
 * một chuỗi trong đó là app tự đá người dùng ra đăng nhập vì một sự cố CSDL.
 */
export const SERVER_ERROR_VN =
  'Hệ thống đang gặp sự cố, vui lòng thử lại sau.';

// User-friendly Vietnamese error messages for login
export const loginErrorMessages = {
  [messages.usernameAndPasswordRequired]:
    'Vui lòng nhập tên đăng nhập và mật khẩu',
  [messages.invalidCredentials]: 'Thông tin đăng nhập không chính xác',
  [messages.userNotReferrer]: 'Bạn không phải là người giới thiệu',
  [messages.userNotVerifiedEmailSentAgain]:
    'Tài khoản chưa được xác thực, email đã được gửi lại, vui lòng kiểm tra email',
  [messages.userNotActive]: 'Tài khoản chưa được kích hoạt',
  [messages.accountDeactivated]: ACCOUNT_DEACTIVATED_VN,
  [messages.userNotFound]: 'Tài khoản không tồn tại',
  [messages.emailAlreadyExists]: 'Email đã tồn tại',
  // Network/system errors
  networkError: 'Lỗi kết nối mạng. Vui lòng thử lại sau',
  systemError: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau',
};
