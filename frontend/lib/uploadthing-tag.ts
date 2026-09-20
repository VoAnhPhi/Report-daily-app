import { randomUUID } from 'node:crypto';

import { UTFiles } from 'uploadthing/server';
import type {
  FileUploadData,
  FileUploadDataWithCustomId,
} from 'uploadthing/types';

/**
 * Nhãn môi trường cho file UploadThing.
 *
 * Cả hệ ACTA dùng CHUNG một app UploadThing (`2evl34cah0`) cho mọi môi trường,
 * và UploadThing không có folder/prefix/namespace bên trong một app. Ba thứ duy
 * nhất đọc lại được qua `UTApi.listFiles` là `name`, `customId`, `uploadedAt`
 * — nên nhãn môi trường phải được nhét vào `name` + `customId` ngay lúc upload,
 * thông qua symbol `UTFiles` của middleware (uploadthing >= 6.4).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CHỈ HAI NHÃN, CHỈ MỘT NGUỒN: `NODE_ENV`
 * ═══════════════════════════════════════════════════════════════════════════
 *   `NODE_ENV === 'production'`  ->  `prod`
 *   mọi giá trị khác / không có  ->  `dev`
 *
 * Không có nhãn `local` (máy cá nhân gộp vào `dev`), không có `unknown`.
 * Mặc định nghiêng về `dev`: gắn nhầm `dev` cho tệp prod chỉ khiến phải kiểm
 * tra thêm trước khi xoá; gắn nhầm `prod` cho tệp rác thì rác đó được bảo vệ
 * vĩnh viễn.
 *
 * ⚠ NEXT.JS THAY `process.env.NODE_ENV` BẰNG HẰNG SỐ LÚC BUILD.
 * Trình biên dịch của Next nội tuyến biến này (DefinePlugin) cho cả mã máy chủ,
 * nên `docker run -e NODE_ENV=…` KHÔNG đổi được giá trị ở kho này. Muốn tier dev
 * ra nhãn `dev` thì phải đặt giá trị TRƯỚC `next build`, trong Dockerfile —
 * hiện `Dockerfile*` của kho này đang ép `ENV NODE_ENV=production` ở cả hai
 * tầng build và runtime.
 */

export type UploadEnvTag = 'prod' | 'dev';

export function getUploadEnvTag(): UploadEnvTag {
  return process.env.NODE_ENV?.trim().toLowerCase() === 'production'
    ? 'prod'
    : 'dev';
}

/**
 * Sinh mảng override cho `[UTFiles]`.
 *
 * - `customId` LUÔN mang tiền tố môi trường. UploadThing bắt buộc `customId`
 *   duy nhất toàn app nên phải kèm UUID — không được đặt trống hay đặt đúng
 *   chữ `dev`.
 * - `name` chỉ gắn tiền tố `[dev] ` khi là dev, để trải nghiệm người dùng thật
 *   không bị đổi. Đổi `name` không làm đổi URL: URL là `<appId>.ufs.sh/f/<key>`,
 *   `key` do máy chủ sinh, độc lập với tên tệp.
 */
export function buildEnvTaggedFiles(
  files: readonly FileUploadData[],
  envTag: UploadEnvTag = getUploadEnvTag(),
): Partial<FileUploadDataWithCustomId>[] {
  return files.map((file) => ({
    ...file,
    name: envTag === 'prod' ? file.name : `[${envTag}] ${file.name}`,
    customId: `${envTag}__${randomUUID()}`,
  }));
}

export type EnvTagMiddlewareArgs = { files: readonly FileUploadData[] };

/**
 * Middleware gắn nhãn, KHÔNG kèm cổng quyền — giữ nguyên hành vi upload hiện có.
 *
 * Route nào cần xác thực thì gộp kết quả này vào metadata của nó (xem
 * `requireAdminSession` ở `acta-admin`), chứ đừng chép lại cách gắn nhãn: quy
 * ước nhãn chỉ được có MỘT nơi định nghĩa.
 */
export const envTagMiddleware = ({ files }: EnvTagMiddlewareArgs) => ({
  [UTFiles]: buildEnvTaggedFiles(files),
});
