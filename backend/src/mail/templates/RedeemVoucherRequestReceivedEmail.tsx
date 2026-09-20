import * as React from 'react';

export function RedeemVoucherRequestReceivedEmail(props: {
  userName?: string;
  email: string;
  referenceId?: string | null;
  voucherLabel?: string;
}) {
  const name = props.userName || 'bạn';
  return (
    <div
      style={{
        fontFamily:
          '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif',
        color: '#111827',
        lineHeight: 1.6,
      }}
    >
      <h2 style={{ marginTop: 0 }}>Đã nhận yêu cầu đổi voucher</h2>
      <p>
        Xin chào {name},{' '}
        {props.referenceId ? `(Ref: ${props.referenceId})` : null}
      </p>
      <p>
        Chúng tôi đã nhận được thông tin đổi voucher của bạn
        {props.voucherLabel ? ` cho "${props.voucherLabel}"` : ''}. Đội ngũ
        ACTA sẽ kiểm tra và phản hồi kết quả qua email này trong thời gian sớm
        nhất.
      </p>
      <p>
        Nếu bạn không thực hiện yêu cầu này, vui lòng phản hồi lại email{' '}
        <a href='mailto:lienhe@acta.vn'>lienhe@acta.vn</a>.
      </p>
      <hr />
      <p style={{ fontSize: 12, color: '#6B7280' }}>
        Email này được gửi tới {props.email}. Vui lòng không trả lời email nếu
        không cần thêm thông tin.
      </p>
    </div>
  );
}


