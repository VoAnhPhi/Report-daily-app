import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

/*
 * Dùng flat config NATIVE của `eslint-config-next`, không qua `FlatCompat`.
 *
 * Bản cũ bọc hai preset này bằng `FlatCompat` (`@eslint/eslintrc`). Với
 * `eslint-config-next@16` — vốn đã xuất sẵn mảng flat config — cách bọc đó làm
 * ESLint chết ngay khi nạp cấu hình:
 *
 *     TypeError: Converting circular structure to JSON
 *       at ConfigValidator.formatErrors (@eslint/eslintrc/lib/shared/config-validator.js)
 *
 * Nghĩa là lệnh `eslint` KHÔNG chạy được ở repo này, im lặng, cho tới khi có
 * người thật sự gõ nó. Import thẳng thì hết.
 */
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'react/no-unescaped-entities': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@next/next/no-img-element': 'off',
      'react-hooks/exhaustive-deps': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  {
    /*
     * Bật lại `no-unused-vars` cho ĐÚNG ba vùng đang refactor cấu trúc (P7).
     *
     * Vì sao cần: sau khi dời file và tách component, thứ sót lại nhiều nhất là
     * import chết — mà `tsc` im lặng (`noUnusedLocals` chưa bật) và luật này
     * đang `off` toàn cục. Không có nó thì mỗi lô refactor để lại một ít rác
     * không cổng nào thấy.
     *
     * Để `warn` chứ không `error`: mục tiêu là làm rác HIỆN RA trong lúc dọn,
     * không phải chặn build của người khác. Giới hạn ba prefix để không bới lên
     * hàng trăm cảnh báo có sẵn ở phần còn lại của repo.
     */
    files: [
      'components/tasks/**/*.{ts,tsx}',
      'components/daily-report/**/*.{ts,tsx}',
      'app/(routes)/tasks/**/*.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    /*
     * Tầng dữ liệu KHÔNG được import xuống tầng component.
     *
     * Luật này khoá lại đúng thứ lô P7.4 vừa dọn: `caregiver-context.tsx` từng
     * nằm trong `components/tasks/` nhưng bị ba file `hooks/queries/*` import
     * ngược lên — provider mà tầng dữ liệu cần đọc thì không được ở trong
     * `components/`. Nay nó ở `contexts/`, và luật này giữ cho nó ở đó.
     *
     * Phạm vi CHỈ là `hooks/queries/` chứ không phải cả `hooks/`: ba hook UI
     * (`use-confirm`, `use-rankings`, `use-comments`) có import component thật
     * và đó là đúng vai trò của chúng — chặn cả `hooks/` sẽ báo lỗi ngay ở ba
     * file không liên quan gì tới việc này.
     *
     * `error` chứ không `warn`: đây là ranh giới kiến trúc, vi phạm nó là quay
     * lại đúng chỗ vừa sửa.
     */
    files: ['hooks/queries/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/components/*', '../components/*', '**/components/*'],
              message:
                'Tầng dữ liệu (hooks/queries) không được import từ components/. ' +
                'Provider hay tiện ích mà nó cần phải nằm ở contexts/ hoặc lib/.',
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
