/**
 * Bề mặt công khai của tiện ích Báo cáo hằng ngày — 74 export tính tới
 * 25/08/2026, chia theo chủ đề trong `./utils/`.
 *
 * Giữ file này làm barrel là quyết định có chủ ý, dù repo không có thói quen
 * dùng barrel: 25 file đang import từ đây, gồm 5 file test và 5 file ngoài thư
 * mục — cả 5 đều nằm trong `components/tasks/`: `tasks-route-shell.tsx`,
 * `task-group-modal.tsx`, `create-task-modal.tsx`, `form/task-edit-form.tsx`,
 * `detail/checklist-item-history.tsx`.
 *
 * Luật đi kèm: code MỚI bên trong `components/daily-report/` import thẳng
 * `./utils/<file>`; chỉ code ngoài thư mục mới đi qua barrel này.
 *
 * Hai con số trên rữa theo thời gian — đếm lại thay vì tin:
 *   grep -c '^export ' components/daily-report/utils/*.ts   → số export
 *   grep -rl 'daily-report-utils' --include=*.ts{,x} .      → số file import
 * `app/(routes)/tasks/page.tsx` từng có tên trong danh sách này; sau đợt tách
 * route nó chỉ còn 4 dòng render `<TasksRouteShell />` và không import gì ở đây.
 */
export * from './utils/classes';
export * from './utils/constants';
export * from './utils/date';
export * from './utils/schedule';
export * from './utils/labels';
export * from './utils/status';
export * from './utils/scope-nav';
export * from './utils/history-grouping';
