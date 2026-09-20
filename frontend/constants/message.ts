export const messages = {
  // Registration & login
  referrerNotFound: 'Người giới thiệu không tồn tại',
  accountCreatedSuccessfully: 'Tạo tài khoản thành công',
  accountAlreadyExists: 'Email đã tồn tại trong hệ thống',
  phoneNumberAlreadyExists: 'Số điện thoại đã tồn tại trong hệ thống',
  cccdAlreadyExists:
    'Số CCCD này đã được sử dụng để đăng ký tài khoản khác. Vui lòng kiểm tra lại hoặc liên hệ hỗ trợ nếu bạn chưa từng đăng ký.',
  accountCreationFailed: 'Tạo tài khoản thất bại',
  loginSuccessfully: 'Đăng nhập thành công',
  loginFailed: 'Đăng nhập thất bại',
  userNotVerified: 'Tài khoản chưa được xác thực',
  invalidCredentials: 'Tài khoản hoặc mật khẩu không hợp lệ',
  userNotActive: 'Tài khoản chưa được kích hoạt',
  // Tài khoản bị admin vô hiệu hóa — khác với userNotActive ("chưa kích hoạt").
  accountDeactivated:
    'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ ACTA để được hỗ trợ.',
  userNotVerifiedEmailSentAgain:
    'Tài khoản chưa được xác thực, email đã được gửi lại, vui lòng kiểm tra email',
  userNotFound: 'Tài khoản không tồn tại',
  invalidVerificationToken: 'Mã xác thực không hợp lệ',
  expiredVerficationTokenAndResend:
    'Mã xác thực đã hết hạn, vui lòng kiểm tra lại email và xác thực lại',
  userWithSamePhoneNumberAlreadyExists:
    'Số điện thoại đã tồn tại trong hệ thống, do đó tài khoản đã bị khoá. Vui lòng liên hệ admin để được hỗ trợ',
  // Email verification
  emailVerifiedSuccessfully: 'Email đã được xác thực thành công',
  emailVerificationSent: 'Email đã được gửi lại',
  emailResendSuccessfully: 'Email đã được gửi lại thành công',
  emailResendFailed: 'Người dùng không tồn tại hoặc đã được xác thực email',
  emailVerificationExpired: 'Email đã hết hạn',
  emailSendingFailed: 'Gửi email thất bại',
  emailNotFound: 'Email không tồn tại',
  userActionRequestedSuccessfully: 'Thực hiện hành động thành công',
  userActionRequestedFailed: 'Thực hiện hành động thất bại',
  invalidRequestAction: 'Hành động không hợp lệ',

  // Password reset
  passwordResetSuccess: 'Đặt lại mật khẩu thành công',
  passwordResetFailed: 'Đặt lại mật khẩu thất bại',
  passwordResetEmailSent: 'Email đặt lại mật khẩu đã được gửi',
  passwordResetEmailAlreadySent:
    'Email đặt lại mật khẩu đã được gửi, vui lòng kiểm tra email',
  tokenInvalid: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn',

  // Change password (new messages)
  otpSentSuccessfully: 'Mã OTP đã được gửi đến email của bạn',
  invalidCurrentPassword: 'Mật khẩu hiện tại không đúng',
  invalidOtp: 'Mã OTP không chính xác hoặc đã hết hạn',
  passwordChangeSuccess: 'Mật khẩu đã được thay đổi thành công',
  passwordChangeFailed: 'Thay đổi mật khẩu thất bại',

  // Interactions
  likeSuccess: 'Thích thành công',
  commentSuccess: 'Bình luận thành công',

  // Generic
  passwordNotMatch: 'Mật khẩu không khớp',
  somethingWentWrong: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
  tooManyRequests: 'Quá nhiều yêu cầu. Vui lòng thử lại sau',
};
