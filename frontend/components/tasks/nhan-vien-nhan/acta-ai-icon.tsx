'use client';

import { cn } from '@/lib/utils';

/**
 * Dấu hiệu ACTA phiên bản AI — icon riêng của Nhân viên Nhàn.
 *
 * Hình học KHÔNG vẽ tay: đường bao một cánh được trích thẳng từ pixel của
 * `/logomatnen.png` (dò biên trên ảnh đã tách nền, lấy mẫu đều 240 điểm, làm
 * mượt, rút gọn Ramer–Douglas–Peucker rồi nối Catmull–Rom thành Bézier), sau đó
 * xoay 120°/240° quanh tâm. Ba cánh trong logo gốc đo ra bằng nhau tới từng
 * pixel (38 896 / 38 833 / 38 801 điểm, lệch góc 120,5° và 119,4°), nên một
 * cánh cộng hai phép xoay là tái tạo đúng, không phải xấp xỉ. Chồng lên ảnh
 * gốc thì hai hình trùng khít.
 *
 * Hai chi tiết thêm vào để nó đọc thành "AI" chứ không chỉ là logo thu nhỏ:
 *
 *   1. NÉT VIỀN CÙNG MÀU quanh mỗi cánh. Logo gốc có ba cánh khá mảnh; ở 17–20px
 *      chúng vỡ thành ba vệt rời. Nét 2.5 đơn vị làm ba cánh dính lại thành một
 *      khối nhận ra được — thử ở đúng kích thước thật, không suy đoán.
 *   2. NGÔI SAO BỐN CÁNH đặt vào KHOẢNG ÂM TAM GIÁC sẵn có ở giữa. Thử cả
 *      phương án gắn sao ở góc trên phải: ở 17px nó biến cụm thành "đốm vàng +
 *      đốm đen" và mất hẳn nhận dạng ACTA. Đặt vào lòng thì tận dụng chỗ trống
 *      vốn có, giữ nguyên bóng ngoài của dấu hiệu, và vẫn nói được "có AI ở
 *      trong".
 *
 * Ngôi sao tô bằng `--color-ws-ink` chứ không phải màu đen cứng: bảng token có
 * chế độ tối (`ws-ink` lật thành #e8eaed), nên sao tự đảo thành sáng trên nền
 * tối thay vì biến mất. Quầng tách sao khỏi cánh dùng `--color-ws-surface` vì
 * nút chứa nó luôn nằm trên mặt đó.
 */
export function ActaAiIcon({
  className,
  title,
}: {
  className?: string;
  /** Đặt khi icon đứng một mình; bỏ trống khi nút bọc ngoài đã có nhãn. */
  title?: string;
}) {
  return (
    <svg
      viewBox='0 0 100 100'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={cn('shrink-0', className)}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        {/* Dải màu đo từ chính pixel logo: vàng sáng → hổ phách → cam đất. */}
        <linearGradient
          id='acta-ai-canh'
          x1='34'
          y1='6'
          x2='66'
          y2='48'
          gradientUnits='userSpaceOnUse'
        >
          <stop stopColor='#FFD426' />
          <stop offset='.55' stopColor='#FDBB13' />
          <stop offset='1' stopColor='#F5A31C' />
        </linearGradient>
      </defs>

      {/* Thu nhẹ về 0.94 để nét viền không bị cắt ở mép viewBox. */}
      <g
        transform='translate(3 3) scale(0.94)'
        stroke='#FDBB13'
        strokeWidth='2.5'
        strokeLinejoin='round'
      >
        <path
          id='acta-ai-blade'
          d='M42.96 6.18C44.12 6.13 45.82 6.23 46.97 6.71C48.11 7.20 49.07 8.00 49.85 9.10C50.63 10.20 50.88 10.51 51.63 13.31C52.38 16.11 53.44 22.70 54.34 25.90C55.24 29.11 55.80 30.32 57.03 32.53C58.26 34.74 59.80 37.13 61.71 39.16C63.63 41.19 67.60 43.63 68.54 44.72C69.47 45.82 68.60 45.32 67.31 45.72C66.02 46.13 62.85 47.02 60.80 47.15C58.75 47.29 57.48 47.45 55.02 46.52C52.57 45.58 48.60 43.35 46.07 41.55C43.55 39.76 41.60 37.82 39.90 35.75C38.19 33.69 36.87 31.56 35.84 29.16C34.81 26.77 33.96 23.90 33.71 21.36C33.46 18.83 33.67 16.10 34.32 13.98C34.98 11.86 36.68 9.80 37.63 8.64C38.58 7.48 39.13 7.43 40.01 7.02C40.90 6.61 41.80 6.23 42.96 6.18Z'
          fill='url(#acta-ai-canh)'
        />
        <use href='#acta-ai-blade' transform='rotate(120 50 50)' />
        <use href='#acta-ai-blade' transform='rotate(240 50 50)' />
      </g>

      {/* Quầng cùng màu mặt nền, vẽ TRƯỚC để sao nằm gọn trong một khe trống. */}
      <path
        d={SAO}
        fill='none'
        stroke='var(--color-ws-surface, #ffffff)'
        strokeWidth='3'
        strokeLinejoin='round'
      />
      <path d={SAO} fill='var(--color-ws-ink, #16171A)' />
    </svg>
  );
}

/**
 * Ngôi sao bốn cánh, tâm (50, 47), bán kính 15. Bốn cánh LÕM (điểm điều khiển
 * kéo về tâm ở 30% bán kính) — cánh thẳng trông như dấu cộng, cánh lõm mới ra
 * hình lấp lánh mà mắt đọc ngay là "AI".
 *
 * Đặt hơi cao hơn tâm hình học 3 đơn vị vì khoảng âm của dấu hiệu không đối
 * xứng trên–dưới; canh theo tâm hình học thì sao nhìn như bị tụt xuống.
 */
const SAO = (() => {
  const cx = 50;
  const cy = 47;
  const r = 15;
  const k = r * 0.3;
  return (
    `M${cx} ${cy - r}` +
    `C${cx + k * 0.5} ${cy - k} ${cx + k} ${cy - k * 0.5} ${cx + r} ${cy}` +
    `C${cx + k} ${cy + k * 0.5} ${cx + k * 0.5} ${cy + k} ${cx} ${cy + r}` +
    `C${cx - k * 0.5} ${cy + k} ${cx - k} ${cy + k * 0.5} ${cx - r} ${cy}` +
    `C${cx - k} ${cy - k * 0.5} ${cx - k * 0.5} ${cy - k} ${cx} ${cy - r}Z`
  );
})();
