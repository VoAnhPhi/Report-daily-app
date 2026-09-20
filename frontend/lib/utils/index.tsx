import { clsx, type ClassValue } from 'clsx';
import {
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Presentation,
  Video,
} from 'lucide-react';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Thang cỡ chữ của workspace, khai ở `app/globals.css` dưới dạng `--text-ws-*`.
 *
 * Phải liệt kê tay vì `tailwind-merge` không đọc CSS — nó chỉ biết những gì
 * được khai ở đây. Thêm một cỡ mới vào `globals.css` mà quên dòng này thì cỡ đó
 * lại bị nuốt y như bug bên dưới.
 */
const WS_FONT_SIZES = [
  'ws-h1',
  'ws-h2',
  'ws-panel-title',
  'ws-card-title',
  'ws-body',
  'ws-cell',
  'ws-meta',
  'ws-chip',
  'ws-chip-sm',
  'ws-micro',
  'ws-nano',
  'ws-floor',
] as const;

/**
 * `globals.css` khai HAI họ token cùng sinh ra tiền tố `text-ws-*`:
 * `--color-ws-*` (màu chữ) và `--text-ws-*` (cỡ chữ). `tailwind-merge` mặc định
 * xếp mọi `text-<gì đó lạ>` vào nhóm màu, nên nó coi `text-ws-cell` và
 * `text-ws-ink` là cùng một nhóm và **bỏ cái đứng trước**:
 *
 *     twMerge('text-ws-cell', 'text-ws-ink')  →  'text-ws-ink'      ← mất cỡ chữ
 *
 * Hậu quả là mọi `cn()` đặt cỡ chữ ở chuỗi nền rồi đặt màu ở nhánh điều kiện
 * đều âm thầm rơi về cỡ mặc định của thẻ — không lỗi build, không cảnh báo, chỉ
 * là chữ sai cỡ. Khai `font-size` tường minh tách hai nhóm ra:
 *
 *     cn('text-ws-cell', 'text-ws-ink')       →  'text-ws-cell text-ws-ink'
 *
 * Hai cỡ vẫn gộp với nhau, hai màu vẫn gộp với nhau — chỉ hết gộp chéo.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: [...WS_FONT_SIZES] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
export function getCategoryBadgeColor(category: string) {
  switch (category) {
    case 'standard':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'legal':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'guide':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'form':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getDocumentTypeIcon(fileType: string) {
  switch (fileType) {
    case 'PDF':
      return <FileText className='w-4 h-4 text-red-600' />;
    case 'Word':
      return <FileText className='w-4 h-4 text-blue-600' />;
    case 'Excel':
      return <FileSpreadsheet className='w-4 h-4 text-green-600' />;
    case 'PPT':
      return <Presentation className='w-4 h-4 text-orange-600' />;
    case 'Video':
      return <Video className='w-4 h-4 text-purple-600' />;
    case 'Image':
      return <FileImage className='w-4 h-4 text-cyan-600' />;
    default:
      return <File className='w-4 h-4 text-gray-600' />;
  }
}

export const capitalize = (str: string): string => {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Uppercase chữ cái đầu tiên của mỗi từ
 * @param str - String cần capitalize
 * @returns String với chữ cái đầu của mỗi từ viết hoa
 * @example capitalizeWords('hello world') => 'Hello World'
 */
export const capitalizeWords = (str: string): string => {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Uppercase chữ cái đầu tiên nhưng giữ nguyên case của phần còn lại
 * @param str - String cần capitalize
 * @returns String với chữ cái đầu viết hoa, phần còn lại giữ nguyên
 * @example capitalizeFirst('hELLO wORLD') => 'HELLO wORLD'
 */
export const capitalizeFirst = (str: string): string => {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Chuyển snake_case hoặc kebab-case thành Title Case
 * @param str - String cần chuyển đổi
 * @returns String đã được format
 * @example formatName('user_name') => 'User Name'
 * @example formatName('first-name') => 'First Name'
 */
export const formatName = (str: string): string => {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/[_-]/g, ' ')
    .split(' ')
    .map((word) => capitalize(word))
    .join(' ');
};

export const countries = [
  { code: 'VN', name: 'Việt Nam', phoneCode: '+84' },
  { code: 'US', name: 'Mỹ', phoneCode: '+1' },
  { code: 'GB', name: 'Anh', phoneCode: '+44' },
  { code: 'AU', name: 'Úc', phoneCode: '+61' },
  { code: 'DE', name: 'Đức', phoneCode: '+49' },
  { code: 'FR', name: 'Pháp', phoneCode: '+33' },
  { code: 'JP', name: 'Nhật', phoneCode: '+81' },
  { code: 'BR', name: 'Brazil', phoneCode: '+55' },
  { code: 'IN', name: 'Ấn Độ', phoneCode: '+91' },
  { code: 'CN', name: 'Trung Quốc', phoneCode: '+86' },
  { code: 'MX', name: 'Mexico', phoneCode: '+52' },
  { code: 'IT', name: 'Ý', phoneCode: '+39' },
  { code: 'ES', name: 'Tây Ban Nha', phoneCode: '+34' },
  { code: 'RU', name: 'Nga', phoneCode: '+7' },
];

export function getCountryName(code: string): string {
  return countries.find((c) => c.code === code)?.name || code;
}

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/** Mã thành viên lưu dạng `vn-xxxxx`, hiển thị luôn uppercase (`VN-XXXXX`). */
export const formatReferenceId = (referenceId?: string | null): string => {
  return referenceId?.toUpperCase() ?? '';
};

export const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('vi-VN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
