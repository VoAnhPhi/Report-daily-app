/**
 * Bề mặt công khai của tiện ích Công việc — 33 export, chia theo chủ đề trong
 * `./utils/`.
 *
 * Giữ file này làm barrel là quyết định có chủ ý, dù repo không có thói quen
 * dùng barrel: 30 file đang import từ đây, trong đó có cả `app/(routes)/tasks/`
 * và `app/design/`. Chẻ mà không giữ barrel là sửa 30 file cho một việc không
 * đổi hành vi nào.
 *
 * Luật đi kèm: code MỚI bên trong `components/tasks/` import thẳng
 * `./utils/<file>`; chỉ code ngoài thư mục mới đi qua barrel này.
 */
export * from './utils/task-taxonomy';
export * from './utils/task-people';
export * from './utils/task-board-groups';
export * from './utils/task-progress';
export * from './utils/task-attachment';
export * from './utils/task-scope';
