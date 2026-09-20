'use client';

import { useRouter } from 'next/navigation';
import { ChevronRight, Gift } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { UserStatus } from '@/types/user.type';

/**
 * Nhắc KYC Bậc 1, ghim đầu danh sách thông báo.
 *
 * KHÔNG phải một thông báo thật: nó không nằm trong danh sách trả về từ API,
 * không có trạng thái đã đọc, không tính vào số chưa đọc. Nhờ vậy mở dropdown
 * hay bấm "đánh dấu đã đọc" đều không làm nó biến mất — nó chỉ hết hiện khi
 * KYC Bậc 1 được duyệt (user chuyển sang `active`).
 */
export function KycPinnedNotice({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const { data: session } = useSession();
  const userStatus = (session?.user as { status?: UserStatus } | undefined)
    ?.status;

  // `active` = KYC Bậc 1 đã được duyệt. Mọi trạng thái khác đều là chưa xong.
  if (!session || !userStatus || userStatus === UserStatus.ACTIVE) return null;

  const handleClick = () => {
    onNavigate?.();
    router.push('/kyc');
  };

  return (
    <button
      type='button'
      onClick={handleClick}
      className='flex w-full items-start gap-3 border-b bg-linear-to-r from-amber-50 to-orange-50 p-4 text-left transition-colors hover:from-amber-100 hover:to-orange-100'
    >
      <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500'>
        <Gift className='h-5 w-5 text-white' />
      </div>
      <div className='min-w-0 flex-1'>
        <p className='text-sm font-semibold text-amber-900'>
          Hoàn tất KYC Bậc 1 để nhận quà
        </p>
        <p className='mt-0.5 text-xs text-amber-800'>
          Xác thực giấy tờ để mở khoá đầy đủ chức năng và nhận điểm thưởng.
        </p>
        <span className='mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-900 underline underline-offset-2'>
          Tới Ví giấy tờ
          <ChevronRight className='h-3 w-3' />
        </span>
      </div>
    </button>
  );
}
