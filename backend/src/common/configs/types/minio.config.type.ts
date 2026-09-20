/**
 * Cấu hình MinIO / nginx-vod-module cho video rèn luyện tự host.
 *
 * ⚠️ HAI DOMAIN KHÁC NHAU, không dùng lẫn (nghiệm thu 2026-07-28):
 *  - `endpoint`   = domain S3 API để GHI object   (vd https://file.deliedu.vn)
 *  - `vodBaseUrl` = domain nginx-vod để PHÁT video (vd https://file.delivn.vn)
 *
 * Toàn bộ trường đều optional: `.env.development` chưa có biến MINIO nào, nên
 * cấu hình thiếu KHÔNG được làm sập boot (khác `mux.config.ts` vốn fail-closed).
 * Thiếu cấu hình chỉ chặn đúng thao tác tự host, báo lỗi rõ ràng lúc gọi.
 */
export type MinioConfigType = {
  endpoint?: string;
  accessKey?: string;
  secretKey?: string;
  region: string;
  bucket: string;
  /** Domain phát HLS qua nginx-vod-module. */
  vodBaseUrl?: string;
  /**
   * Tiền tố đường dẫn nguồn NỘI BỘ mà nginx-vod-module dùng để đọc MP4, theo
   * cú pháp riêng của module: `/http/<host>:<port>/<bucket>/<prefix>`.
   * Đây là địa chỉ MinIO nhìn từ trong mạng nhà cung cấp — KHÔNG phải domain
   * public, KHÔNG được thay bằng `endpoint`.
   */
  vodSourcePrefix?: string;
  /** Tiền tố khoá object cho MP4 + tệp mapping (mặc định `video/`). */
  videoPrefix: string;
  /** Tiền tố khoá object cho ảnh poster (mặc định `img/`). */
  imagePrefix: string;
  /**
   * Video rèn luyện TẠO MỚI có mặc định đi thẳng lên hạ tầng tự host thay vì Mux
   * hay không. BẬT sẵn; đặt `MINIO_DEFAULT_SELFHOST=false` để quay lại Mux mà
   * không phải sửa code.
   *
   * Cờ này chỉ là ý muốn — nơi quyết định thật còn phải thấy cấu hình MinIO đầy
   * đủ VÀ có hàng đợi nạp trong tiến trình đang chạy, nếu không sẽ tự lùi về Mux
   * (xem `shouldSelfHostNewVideos`). Bật cờ mà thiếu hạ tầng thì tạo video sẽ
   * hỏng im lặng — nên không được tin cờ một mình.
   */
  defaultNewVideosToSelfHost: boolean;
};
