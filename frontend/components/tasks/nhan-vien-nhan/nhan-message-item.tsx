'use client';

import { useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  Download,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

import { cn } from '@/lib/utils';
import type { NhanMessageDto } from '@/types/nhan-vien-nhan.type';
import { taiExcelTuLuot } from '@/app/api/nhan-vien-nhan';
import { ActaAiIcon } from './acta-ai-icon';
import { NhanRichText } from './nhan-rich-text';
import { NhanProposalCard } from './nhan-proposal-card';

/**
 * Một lượt nói trong khung chat.
 *
 * Lượt NGƯỜI dùng là bong bóng lệch phải, nền chìm. Lượt TRỢ LÝ không dùng bong
 * bóng: nó thường dài (bảng số liệu, danh sách 20 việc, thẻ đề xuất) và một
 * bong bóng bo tròn quanh khối đó chỉ làm hẹp bề ngang đọc được trong một panel
 * vốn đã chỉ 440px. Thay vào đó nó chạy hết bề ngang, phân biệt bằng icon và
 * khoảng thụt — cùng lối mà `TaskActivityFeed` đang dùng cho dòng thời gian.
 */
export function NhanMessageItem({
  message,
  conversationId,
  onOpenTaskCode,
}: {
  message: NhanMessageDto;
  conversationId: string;
  onOpenTaskCode?: (code: string) => void;
}) {
  if (message.role === 'user') {
    return (
      <div className='flex justify-end'>
        <div className='max-w-[85%] whitespace-pre-line break-words rounded-ws-card rounded-br-[4px] bg-ws-surface-sunken px-3 py-2 text-ws-body leading-relaxed text-ws-ink'>
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className='flex gap-2'>
      <ActaAiIcon className='mt-0.5 h-[18px] w-[18px]' />
      <div className='min-w-0 flex-1'>
        {message.toolTrace.length > 0 && (
          <VetCongCu trace={message.toolTrace} />
        )}

        {message.content && (
          <NhanRichText
            text={message.content}
            onOpenTaskCode={onOpenTaskCode}
            className='text-ws-body leading-relaxed text-ws-ink'
          />
        )}

        {message.errorMessage && (
          <p className='mt-1.5 flex gap-1.5 rounded-ws-chip bg-ws-void-bg px-2 py-1.5 text-ws-meta leading-snug text-ws-void-fg'>
            <AlertCircle className='mt-[2px] h-3.5 w-3.5 shrink-0' />
            <span>{message.errorMessage}</span>
          </p>
        )}

        {message.sources.length > 0 && <Nguon sources={message.sources} />}

        {message.taiVe?.san && (
          <NutTaiVe messageId={message.id} tenTep={message.taiVe.tenTep} />
        )}

        {message.proposals.map((p) => (
          <NhanProposalCard
            key={p.id}
            proposal={p}
            conversationId={conversationId}
          />
        ))}

        {message.model && (
          <p className='mt-1.5 text-ws-nano text-ws-ink-ghost'>
            {NHAN_MODEL[message.model] ?? message.model}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Vết chạy công cụ, mặc định gập lại thành một dòng.
 *
 * Mở sẵn thì mỗi câu trả lời mở đầu bằng năm dòng kỹ thuật, đẩy nội dung thật
 * xuống dưới nếp gấp. Gập lại nhưng vẫn để mở được, vì khi trợ lý trả lời sai
 * thì "nó đã tra cái gì" là câu hỏi đầu tiên.
 */
function VetCongCu({
  trace,
}: {
  trace: NhanMessageDto['toolTrace'];
}) {
  const [mo, setMo] = useState(false);
  const hong = trace.filter((t) => !t.thanhCong).length;

  return (
    <div className='mb-1.5'>
      <button
        type='button'
        onClick={() => setMo((v) => !v)}
        className='flex items-center gap-1 text-ws-nano text-ws-ink-ghost transition-colors hover:text-ws-ink-soft'
      >
        <ChevronDown
          className={cn(
            'h-3 w-3 transition-transform duration-[120ms]',
            mo && 'rotate-180',
          )}
        />
        Đã dùng {trace.length} công cụ
        {hong > 0 && (
          <span className='text-ws-void-fg'> · {hong} lỗi</span>
        )}
      </button>
      {mo && (
        <ul className='mt-1 space-y-0.5 border-l border-ws-line-soft pl-2'>
          {trace.map((t, i) => (
            <li key={i} className='text-ws-nano leading-snug text-ws-ink-faint'>
              <span
                className={cn(
                  'font-medium',
                  t.thanhCong ? 'text-ws-ink-soft' : 'text-ws-void-fg',
                )}
              >
                {t.nhan}
              </span>
              {t.tomTat ? ` — ${t.tomTat}` : ''}
              {typeof t.msChay === 'number' ? ` (${t.msChay}ms)` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * URL này có an toàn để đưa vào `href` không?
 *
 * ⚠ Nguồn KHÔNG phải lúc nào cũng do máy tìm kiếm của Anthropic trả về: công cụ
 * `de_xuat_binh_luan` nhận mảng nguồn từ THAM SỐ do model sinh, và tham số đó
 * được lưu rồi hiện lại ở đây. Một `javascript:` lọt vào là chạy mã trong phiên
 * của super admin. Chỉ cho http/https, và chặn cả URL không phân tích được.
 */
function urlAnToan(u: string): boolean {
  try {
    const giaoThuc = new URL(u).protocol;
    return giaoThuc === 'http:' || giaoThuc === 'https:';
  } catch {
    return false;
  }
}

function Nguon({ sources }: { sources: NhanMessageDto['sources'] }) {
  return (
    <div className='mt-2 rounded-ws-chip border border-ws-line-soft bg-ws-surface-alt px-2.5 py-2'>
      <p className='text-ws-nano font-semibold uppercase tracking-wide text-ws-ink-faint'>
        Nguồn tham khảo
      </p>
      <ul className='mt-1 space-y-1'>
        {sources.map((n, i) => (
          <li key={i}>
            {urlAnToan(n.url) ? (
              <a
                href={n.url}
                target='_blank'
                rel='noopener noreferrer'
                className='inline-flex items-start gap-1 text-ws-meta leading-snug text-ws-accent hover:underline'
              >
                <ExternalLink className='mt-[3px] h-3 w-3 shrink-0' />
                <span className='break-all'>{n.tieuDe}</span>
              </a>
            ) : (
              // Hiện nguyên văn thay vì bỏ đi: người dùng cần thấy trợ lý đã
              // đưa ra một đường dẫn lạ, chứ không phải một khoảng trống.
              <span className='inline-flex items-start gap-1 text-ws-meta leading-snug text-ws-ink-faint'>
                <ExternalLink className='mt-[3px] h-3 w-3 shrink-0' />
                <span className='break-all'>
                  {n.tieuDe} — đường dẫn không hợp lệ, đã chặn
                </span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NutTaiVe({
  messageId,
  tenTep,
}: {
  messageId: string;
  tenTep: string;
}) {
  const [dangTai, setDangTai] = useState(false);
  // Lấy token ngay tại đây thay vì truyền xuyên bốn tầng prop: đây là chỗ DUY
  // NHẤT trong khung chat gọi API ngoài tầng TanStack Query.
  const { data: session } = useSession();

  const tai = async () => {
    const accessToken = session?.accessToken;
    if (!accessToken) {
      toast.error('Phiên đăng nhập đã hết hạn, hãy tải lại trang.');
      return;
    }
    setDangTai(true);
    try {
      await taiExcelTuLuot({ accessToken, messageId, tenTepDuPhong: tenTep });
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : 'Không tải được bảng tính',
      );
    } finally {
      setDangTai(false);
    }
  };

  return (
    <button
      type='button'
      onClick={tai}
      disabled={dangTai}
      className='mt-2 inline-flex items-center gap-1.5 rounded-ws-control border border-ws-line bg-ws-surface px-2.5 py-1.5 text-ws-meta font-medium text-ws-ink transition-colors hover:bg-ws-surface-alt disabled:opacity-60'
    >
      {dangTai ? (
        <Loader2 className='h-3.5 w-3.5 animate-spin' />
      ) : (
        <Download className='h-3.5 w-3.5' />
      )}
      Tải bảng tính
    </button>
  );
}

/**
 * Tên model hiện cho người dùng. Ghi ra là cố ý: bộ định tuyến có leo thang từ
 * Haiku sang Sonnet, nên khi hoá đơn tăng thì phải nhìn được lượt nào đã leo.
 */
const NHAN_MODEL: Record<string, string> = {
  'claude-haiku-4-5': 'Chế độ tiết kiệm',
  'claude-sonnet-5': 'Chế độ suy luận sâu',
};
