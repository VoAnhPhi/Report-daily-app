/**
 * Permission codes for granular access control
 * Format: {category}.{action}
 */
export enum PermissionCode {
  // ============================================================================
  // DASHBOARD - Trang tổng quan
  // ============================================================================
  DASHBOARD_VIEW = 'dashboard.view',
  DASHBOARD_ANALYTICS = 'dashboard.analytics',
  DASHBOARD_MANAGE = 'dashboard.manage',

  // ============================================================================
  // USERS - Quản lý người dùng
  // ============================================================================
  USERS_VIEW = 'users.view',
  USERS_CREATE = 'users.create',
  USERS_UPDATE = 'users.update',
  USERS_DELETE = 'users.delete',
  USERS_EXPORT = 'users.export',
  USERS_MANAGE_ROLES = 'users.manage_roles',
  USERS_MANAGE = 'users.manage',
  USERS_VIEW_SENSITIVE = 'users.view_sensitive', // View sensitive info like KYC
  // Gán người giới thiệu cho tài khoản đang trống / đang do hệ thống tự gán.
  // ⚠ Cố ý TÁCH khỏi `users.manage`: thao tác này DỜI CẢ NHÁNH trong cây tuyến, nên nó
  // đổi dòng hoa hồng về sau. Cùng lý lẽ với việc tách quyền duyệt phiếu điểm (§87):
  // câu hỏi khi cấp quyền là "người này có được phép làm phát sinh chi phí không?".
  USERS_ASSIGN_REFERRER = 'users.assign_referrer',

  // ============================================================================
  // PRODUCTS - Quản lý sản phẩm
  // ============================================================================
  PRODUCTS_VIEW = 'products.view',
  PRODUCTS_CREATE = 'products.create',
  PRODUCTS_UPDATE = 'products.update',
  PRODUCTS_DELETE = 'products.delete',
  PRODUCTS_EXPORT = 'products.export',
  PRODUCTS_IMPORT = 'products.import',
  PRODUCTS_MANAGE = 'products.manage', // Full product management (includes all product permissions)
  // Hai quyền THƯƠNG MẠI dưới đây KHÔNG nằm trong PRODUCTS_MANAGE: người quản lý
  // nội dung sản phẩm (ảnh, mô tả, phân loại) không đương nhiên được đặt giá hay
  // mở bán. Cổng thật nằm ở product-reviews.service.ts (submit + duyệt + duyệt hàng loạt).
  PRODUCT_PRICING_MANAGE = 'products.pricing.manage',
  PRODUCT_PUBLISH_MANAGE = 'products.publish.manage',
  // Ghim sản phẩm cũng KHÔNG nằm trong PRODUCTS_MANAGE, cùng lý do với hai quyền
  // trên: ghim là quyết định trưng bày toàn sàn (đẩy sản phẩm lên đầu mọi danh
  // sách + tăng điểm tìm kiếm), không phải việc sửa nội dung sản phẩm.
  PRODUCT_PIN_MANAGE = 'products.pin.manage',

  // ============================================================================
  // PRODUCT REVIEWS - Đánh giá sản phẩm
  // ============================================================================
  PRODUCT_REVIEWS_VIEW = 'product-reviews.view',
  PRODUCT_REVIEWS_SUBMIT = 'product-reviews.submit',
  PRODUCT_REVIEWS_APPROVE = 'product-reviews.approve',
  PRODUCT_REVIEWS_MANAGE = 'product-reviews.manage',

  // ============================================================================
  // BUSINESS REVIEWS - Duyệt doanh nghiệp
  // ============================================================================
  BUSINESS_REVIEWS_VIEW = 'business-reviews.view',
  BUSINESS_REVIEWS_SUBMIT = 'business-reviews.submit',
  BUSINESS_REVIEWS_APPROVE = 'business-reviews.approve',
  BUSINESS_REVIEWS_MANAGE = 'business-reviews.manage',

  // ============================================================================
  // VOUCHER REVIEWS - Duyệt voucher
  // ============================================================================
  VOUCHER_REVIEWS_VIEW = 'voucher-reviews.view',
  VOUCHER_REVIEWS_SUBMIT = 'voucher-reviews.submit',
  VOUCHER_REVIEWS_APPROVE = 'voucher-reviews.approve',
  VOUCHER_REVIEWS_MANAGE = 'voucher-reviews.manage',

  // ============================================================================
  // CATEGORY REVIEWS - Duyệt danh mục
  // ============================================================================
  CATEGORY_REVIEWS_VIEW = 'category-reviews.view',
  CATEGORY_REVIEWS_SUBMIT = 'category-reviews.submit',
  CATEGORY_REVIEWS_APPROVE = 'category-reviews.approve',
  CATEGORY_REVIEWS_MANAGE = 'category-reviews.manage',

  // ============================================================================
  // INVOICE REVIEWS - Duyệt hóa đơn
  // ============================================================================
  INVOICE_REVIEWS_VIEW = 'invoice-reviews.view',
  INVOICE_REVIEWS_SUBMIT = 'invoice-reviews.submit',
  INVOICE_REVIEWS_APPROVE = 'invoice-reviews.approve',
  INVOICE_REVIEWS_MANAGE = 'invoice-reviews.manage',

  // ============================================================================
  // BUG REPORTS - Báo cáo lỗi
  // ============================================================================
  BUG_REPORTS_VIEW = 'bug-reports.view',
  BUG_REPORTS_MANAGE = 'bug-reports.manage',

  // ============================================================================
  // CONTRACTS - Hợp đồng (phát hành hợp đồng cho đối tác)
  // ============================================================================
  // `view` chỉ mở được danh sách mẫu và LỊCH SỬ phát hành. `manage` mới là quyền
  // PHÁT HÀNH — tách riêng vì phát hành là hành động cấp một số hợp đồng có giá
  // trị pháp lý và không thu hồi được: người cần tra lại xem đã ký với ai không
  // đương nhiên là người được phép cấp hợp đồng mới.
  CONTRACTS_VIEW = 'contracts.view',
  CONTRACTS_MANAGE = 'contracts.manage',

  // ============================================================================
  // SHRINE - ĐIỆN KIẾN CHỦ (shrines.acta.vn)
  // ============================================================================
  // `revoke` tách riêng khỏi `manage` vì thu hồi là hành động PHÁ HUỶ: nó xoá tên
  // hiển thị khỏi bản ghi công khai và thành viên không tự hoàn tác được.
  SHRINE_VIEW = 'shrine.view',
  SHRINE_MANAGE = 'shrine.manage',
  SHRINE_REVOKE = 'shrine.revoke',

  // ============================================================================
  // THO_DIA - THỔ ĐỊA (mọi điểm trên bản đồ acta-solutions)
  // ============================================================================
  // `duyet` tách khỏi `view` vì duyệt là hành động GHI vào bản ghi công khai:
  // một lượt duyệt đổi ngay tên/địa chỉ/toạ độ mà khách nhìn thấy trên bản đồ.
  // Cố ý KHÔNG tái dùng `warehouses.manage` cho việc duyệt hồ sơ địa điểm: mã đó
  // mở luôn cả sửa nhóm kho, cờ ưu tiên bán/giao và bật/tắt kho — người trực bản
  // đồ không cần và không nên có những thứ ấy.
  THO_DIA_VIEW = 'tho-dia.view',
  THO_DIA_REVIEW = 'tho-dia.duyet',
  /*
    `manage` là mã GHI đầu tiên của Thổ địa: sửa hồ sơ điểm THẲNG từ màn Bản đồ
    điểm, và bật/tắt cờ hiển thị trên bản đồ công khai.

    Tách khỏi `duyet` vì hai vai vận hành khác nhau: `duyet` là XỬ LÝ ĐỀ XUẤT
    CỦA NGƯỜI KHÁC (người gửi đã tự chịu trách nhiệm nội dung), còn `manage` là
    TỰ TAY ĐỔI bản ghi khách đang nhìn thấy. Ai duyệt được không đương nhiên
    được tự sửa — gộp hai mã là mở âm thầm quyền ghi cho toàn bộ người trực
    hàng đợi.
  */
  THO_DIA_MANAGE = 'tho-dia.manage',
  /*
    Nội dung do KHÁCH để lại trên một điểm: đánh giá địa điểm và báo cáo vi phạm.

    Tách riêng vì đây là kiểm duyệt NỘI DUNG NGƯỜI DÙNG — nghiệp vụ và rủi ro
    khác hẳn việc sửa hồ sơ điểm (gỡ một đánh giá là can thiệp vào tiếng nói của
    khách), và trong thực tế thường giao cho người khác.
  */
  THO_DIA_REVIEWS = 'tho-dia.reviews',
  /*
    Phiếu ghi nhận điểm (điểm thưởng liên kết): khách mua ngoài sàn tại một điểm
    cầu, chủ điểm cầu lập phiếu, trả phí dịch vụ, quản trị duyệt rồi hệ thống CẤP
    ĐIỂM cho khách.

    CỐ Ý KHÔNG tái dùng `tho-dia.duyet`. Mã đó là duyệt NỘI DUNG hiển thị trên bản
    đồ; còn duyệt một phiếu ghi nhận điểm là TẠO RA ĐIỂM, mà điểm chảy vào
    `sharingCompositePoints` (order + kyc + affiliate) → danh hiệu Cổ đông lan
    toả ở MỌI cấp (1/2/3) → `moneyPerViewVnd`, tức TIỀN THẬT trả ra ở một cron
    khác, một ngày khác. Gộp hai mã là âm thầm cấp quyền tạo tiền cho toàn bộ
    người đang trực bản đồ.

    `view` tách khỏi `duyet` theo đúng lệ sẵn có của khu này: xem hàng đợi (gồm cả
    nhóm "đã thu phí nhưng bị từ chối" mà kế toán phải hoàn tay) không đồng nghĩa
    được bấm duyệt.
  */
  THO_DIA_GHI_NHAN_DIEM_VIEW = 'tho-dia.ghi-nhan-diem.view',
  THO_DIA_GHI_NHAN_DIEM_REVIEW = 'tho-dia.ghi-nhan-diem.duyet',

  // ============================================================================
  // TECHNICAL ACTIVITIES - Hoạt động KTV
  // ============================================================================
  TECHNICAL_ACTIVITIES_VIEW = 'technical-activities.view',
  TECHNICAL_ACTIVITIES_MANAGE = 'technical-activities.manage',

  // ============================================================================
  // TRAINING VIDEOS - Video rèn luyện (v1.5 Phase 48; MANAGE implies VIEW via @AnyPermission)
  // ============================================================================
  TRAINING_VIDEO_VIEW = 'training-videos.view',
  TRAINING_VIDEO_MANAGE = 'training-videos.manage',

  // ============================================================================
  // TRAINING VIDEO REVIEWS - Duyệt video rèn luyện (v1.5 Phase 49 HARD-09; two-phase gate for partner upload)
  // ============================================================================
  TRAINING_VIDEO_REVIEWS_VIEW = 'training-video-reviews.view',
  TRAINING_VIDEO_REVIEWS_SUBMIT = 'training-video-reviews.submit',
  TRAINING_VIDEO_REVIEWS_APPROVE = 'training-video-reviews.approve',
  TRAINING_VIDEO_REVIEWS_MANAGE = 'training-video-reviews.manage',

  // ============================================================================
  // NEWS REVIEWS - Duyệt tin tức
  // ============================================================================
  NEWS_REVIEWS_VIEW = 'news-reviews.view',
  NEWS_REVIEWS_SUBMIT = 'news-reviews.submit',
  NEWS_REVIEWS_APPROVE = 'news-reviews.approve',
  NEWS_REVIEWS_MANAGE = 'news-reviews.manage',

  // ============================================================================
  // DOCUMENT REVIEWS - Duyệt tài liệu
  // ============================================================================
  DOCUMENT_REVIEWS_VIEW = 'document-reviews.view',
  DOCUMENT_REVIEWS_SUBMIT = 'document-reviews.submit',
  DOCUMENT_REVIEWS_APPROVE = 'document-reviews.approve',
  DOCUMENT_REVIEWS_MANAGE = 'document-reviews.manage',

  // ============================================================================
  // MOMENT REVIEWS - Duyệt khoảnh khắc
  // ============================================================================
  MOMENT_REVIEWS_VIEW = 'moment-reviews.view',
  MOMENT_REVIEWS_SUBMIT = 'moment-reviews.submit',
  MOMENT_REVIEWS_APPROVE = 'moment-reviews.approve',
  MOMENT_REVIEWS_MANAGE = 'moment-reviews.manage',

  // ============================================================================
  // LIVESTREAM REVIEWS - Duyệt livestream
  // ============================================================================
  LIVESTREAM_REVIEWS_VIEW = 'livestream-reviews.view',
  LIVESTREAM_REVIEWS_SUBMIT = 'livestream-reviews.submit',
  LIVESTREAM_REVIEWS_APPROVE = 'livestream-reviews.approve',
  LIVESTREAM_REVIEWS_MANAGE = 'livestream-reviews.manage',

  // ============================================================================
  // STORY REVIEWS - Duyệt story
  // ============================================================================
  STORY_REVIEWS_VIEW = 'story-reviews.view',
  STORY_REVIEWS_SUBMIT = 'story-reviews.submit',
  STORY_REVIEWS_APPROVE = 'story-reviews.approve',
  STORY_REVIEWS_MANAGE = 'story-reviews.manage',

  // ============================================================================
  // CATEGORIES - Quản lý danh mục
  // ============================================================================
  CATEGORIES_VIEW = 'categories.view',
  CATEGORIES_CREATE = 'categories.create',
  CATEGORIES_UPDATE = 'categories.update',
  CATEGORIES_DELETE = 'categories.delete',
  CATEGORIES_MANAGE = 'categories.manage', // Full category management (includes all category permissions)
  CATEGORY_AUDIT_VIEW = 'categories.audit_view', // Xem lịch sử thay đổi danh mục
  CATEGORY_AUDIT_UNDO = 'categories.audit_undo', // Hoàn tác thay đổi danh mục

  // ============================================================================
  // BUSINESSES - Quản lý doanh nghiệp
  // ============================================================================
  BUSINESSES_VIEW = 'businesses.view',
  BUSINESSES_MANAGE = 'businesses.manage', // Full business management

  // ============================================================================
  // VOUCHERS - Quản lý vouchers
  // ============================================================================
  VOUCHERS_VIEW = 'vouchers.view',
  VOUCHERS_CREATE = 'vouchers.create',
  VOUCHERS_UPDATE = 'vouchers.update',
  VOUCHERS_DELETE = 'vouchers.delete',
  VOUCHERS_APPROVE = 'vouchers.approve',
  VOUCHERS_MANAGE = 'vouchers.manage', // Full voucher management

  // ============================================================================
  // ORDERS - Quản lý đơn hàng
  // ============================================================================
  ORDERS_VIEW = 'orders.view',
  ORDERS_CREATE = 'orders.create',
  ORDERS_UPDATE = 'orders.update',
  ORDERS_DELETE = 'orders.delete',
  ORDERS_APPROVE = 'orders.approve',
  ORDERS_EXPORT = 'orders.export',
  ORDERS_MANAGE = 'orders.manage', // Full order management (includes all order permissions)
  ORDERS_PROCESS_REFUND = 'orders.process_refund',
  ORDERS_VIEW_ALL = 'orders.view_all', // View orders from all businesses
  ORDER_REVIEWS_VIEW = 'order_reviews.view', // Xem yêu cầu duyệt chuyển trạng thái đơn hàng
  ORDER_REVIEWS_MANAGE = 'order_reviews.manage', // Duyệt/từ chối yêu cầu chuyển trạng thái đơn hàng

  // ============================================================================
  // INVOICES - Quản lý hóa đơn
  // ============================================================================
  INVOICES_VIEW = 'invoices.view',
  INVOICES_CREATE = 'invoices.create',
  INVOICES_UPDATE = 'invoices.update',
  INVOICES_DELETE = 'invoices.delete',
  INVOICES_EXPORT = 'invoices.export',
  INVOICES_MANAGE = 'invoices.manage', // Full invoice management (includes all invoice permissions)

  // ============================================================================
  // INVENTORY - Quản lý kho
  // ============================================================================
  INVENTORY_VIEW = 'inventory.view',
  INVENTORY_UPDATE = 'inventory.update',
  INVENTORY_TRANSFER = 'inventory.transfer',
  INVENTORY_ADJUST = 'inventory.adjust',
  INVENTORY_EXPORT = 'inventory.export',
  INVENTORY_MANAGE = 'inventory.manage',

  // ============================================================================
  // WAREHOUSES - Quản lý kho hàng
  // ============================================================================
  WAREHOUSES_VIEW = 'warehouses.view',
  WAREHOUSES_CREATE = 'warehouses.create',
  WAREHOUSES_UPDATE = 'warehouses.update',
  WAREHOUSES_DELETE = 'warehouses.delete',
  WAREHOUSES_DEACTIVATE = 'warehouses.deactivate', // Vô hiệu hoá kho (không xoá)
  WAREHOUSES_MANAGE = 'warehouses.manage', // Quản lý tất cả kho
  // Dynamic warehouse permissions will be: warehouses.manage.{warehouseId}

  // ============================================================================
  // SALES APP - Ứng dụng bán hàng tại điểm cầu (app di động "ACTA Bán hàng")
  // ============================================================================
  SALES_APP_ACCESS = 'sales_app.access',
  // Phạm vi TOÀN BỘ điểm cầu. Mã phạm vi TỪNG điểm cầu là mã ĐỘNG
  // `sales_app.manage.{warehouseId}`, dựng bằng template literal từ mã này.
  //
  // ⚠ Đoạn giữa BẮT BUỘC là 'manage'. `parseCategoryAndAction()` cắt action
  // tại dấu chấm thứ hai — `code.slice(dotIndex + 1).split('.')[0]`
  // (permission-discovery.service.ts). Đặt một DANH TỪ ở đó (ví dụ
  // `sales_app.warehouse.{id}`) sẽ ghi `action='warehouse'` vào bảng
  // `permissions`, một giá trị không có trong `PermissionAction`. Cột đó là
  // `String` thuần trong Prisma nên DB KHÔNG chặn ⇒ hỏng ÂM THẦM, mỗi điểm
  // cầu một dòng rác, mâu thuẫn với chính mục cha khai `action: MANAGE`.
  // Hình dạng đúng của hệ thống là `<nhóm>.<HÀNH ĐỘNG>.<id>`, y như
  // `warehouses.manage.{warehouseId}` ngay phía trên.
  SALES_APP_MANAGE = 'sales_app.manage',

  // ============================================================================
  // PURCHASE ORDERS - Quản lý đơn nhập hàng
  // ============================================================================
  PURCHASE_ORDERS_VIEW    = 'purchase_orders.view',
  PURCHASE_ORDERS_MANAGE  = 'purchase_orders.manage',
  PURCHASE_ORDERS_APPROVE = 'purchase_orders.approve',

  // ============================================================================
  // FINANCE - Tài chính
  // ============================================================================
  FINANCE_VIEW = 'finance.view',
  FINANCE_TRANSACTIONS = 'finance.transactions',
  FINANCE_REPORTS = 'finance.reports',
  FINANCE_EXPORT = 'finance.export',
  FINANCE_MANAGE_PAYOUTS = 'finance.manage_payouts',
  FINANCE_APPROVE_WITHDRAWALS = 'finance.approve_withdrawals',
  ACCEPT_HALF_WALLET = 'finance.accept_half_wallet',

  // ============================================================================
  // AFFILIATE - Hệ thống affiliate
  // ============================================================================
  AFFILIATE_VIEW = 'affiliate.view',
  AFFILIATE_MANAGE_COMMISSIONS = 'affiliate.manage_commissions',
  AFFILIATE_APPROVE_WITHDRAWALS = 'affiliate.approve_withdrawals',
  AFFILIATE_VIEW_REPORTS = 'affiliate.view_reports',
  AFFILIATE_MANAGE_RATES = 'affiliate.manage_rates',

  // ============================================================================
  // MARKETING - Marketing & khuyến mãi
  // ============================================================================
  MARKETING_VIEW = 'marketing.view',
  MARKETING_CREATE_CAMPAIGNS = 'marketing.create_campaigns',
  MARKETING_MANAGE_VOUCHERS = 'marketing.manage_vouchers',
  MARKETING_MANAGE_DISCOUNTS = 'marketing.manage_discounts',
  MARKETING_VIEW_ANALYTICS = 'marketing.view_analytics',

  // ============================================================================
  // CONTENT - Nội dung & bài đăng
  // ============================================================================
  CONTENT_VIEW = 'content.view',
  CONTENT_CREATE = 'content.create',
  CONTENT_UPDATE = 'content.update',
  CONTENT_DELETE = 'content.delete',
  CONTENT_APPROVE = 'content.approve',
  CONTENT_SUBMIT = 'content.submit',
  CONTENT_MANAGE = 'content.manage', // Full content management (posts, articles, etc.)

  // ============================================================================
  // REPORTS - Báo cáo & thống kê
  // ============================================================================
  REPORTS_VIEW = 'reports.view',
  REPORTS_SALES = 'reports.sales',
  REPORTS_USERS = 'reports.users',
  REPORTS_PRODUCTS = 'reports.products',
  REPORTS_FINANCE = 'reports.finance',
  REPORTS_EXPORT = 'reports.export',
  REPORTS_ILLUMINATOR = 'reports.illuminator',
  // ============================================================================
  // SETTINGS - Cài đặt hệ thống
  // ============================================================================
  SETTINGS_VIEW = 'settings.view',
  SETTINGS_UPDATE = 'settings.update',
  SETTINGS_MANAGE_BUSINESSES = 'settings.manage_businesses',
  SETTINGS_MANAGE_INTEGRATIONS = 'settings.manage_integrations',
  SETTINGS_MANAGE_EMAILS = 'settings.manage_emails',

  // ============================================================================
  // GAMIFICATION - Gamification & nhiệm vụ
  // ============================================================================
  GAMIFICATION_VIEW = 'gamification.view',
  GAMIFICATION_MANAGE = 'gamification.manage', // Full gamification management (tasks, achievements, points, etc.)

  // ============================================================================
  // TEAMS - Business teams
  // ============================================================================
  BUSINESS_TEAMS_VIEW = 'business_teams.view',
  BUSINESS_TEAMS_CREATE = 'business_teams.create',
  BUSINESS_TEAMS_UPDATE = 'business_teams.update',
  BUSINESS_TEAMS_DELETE = 'business_teams.delete',
  BUSINESS_TEAMS_MANAGE = 'business_teams.manage',
  // ============================================================================
  // PERMISSIONS - Quản lý phân quyền
  // ============================================================================
  PERMISSIONS_VIEW = 'permissions.view',
  PERMISSIONS_MANAGE_ROLES = 'permissions.manage_roles',
  PERMISSIONS_ASSIGN_USERS = 'permissions.assign_users',
  PERMISSIONS_VIEW_AUDIT = 'permissions.view_audit',

  // ============================================================================
  // MAINTENANCE - Maintenance window management
  // ============================================================================
  MAINTENANCE_VIEW = 'maintenance.view',
  MAINTENANCE_MANAGE = 'maintenance.manage',

  // ============================================================================
  // DIADIEM — Business Compliance
  // ============================================================================
  BUSINESS_COMPLIANCE_VIEW = 'business_compliance.view',
  BUSINESS_COMPLIANCE_APPROVE = 'business_compliance.approve',
  BUSINESS_COMPLIANCE_REJECT = 'business_compliance.reject',

  // ============================================================================
  // DIADIEM — Business Brands
  // ============================================================================
  BUSINESS_BRANDS_VIEW = 'business_brands.view',
  BUSINESS_BRANDS_CREATE = 'business_brands.create',
  BUSINESS_BRANDS_UPDATE = 'business_brands.update',
  BUSINESS_BRANDS_DELETE = 'business_brands.delete',
  BUSINESS_BRANDS_APPROVE = 'business_brands.approve',
  BRAND_AUDIT_VIEW = 'business_brands.audit_view', // Xem lịch sử thay đổi thương hiệu
  BRAND_AUDIT_UNDO = 'business_brands.audit_undo', // Hoàn tác thay đổi thương hiệu

  // ============================================================================
  // DIADIEM — Business Locations  → ĐÃ XOÁ 07/09/2026
  // ============================================================================
  //
  // ╔════════════════════════════════════════════════════════════════════════╗
  // ║  SÁU MÃ QUYỀN CỦA "ĐỊA ĐIỂM KINH DOANH" ĐÃ GỠ HẲN — ĐỪNG THÊM LẠI     ║
  // ╚════════════════════════════════════════════════════════════════════════╝
  //
  // `view` / `create` / `update` / `delete` / `publish` / `feature` chỉ có nghĩa
  // với thực thể "địa điểm kinh doanh của bên thứ ba", thứ đã bị xoá khỏi lược đồ
  // ngày 07/09/2026 (ADR §1.3). Điểm trên bản đồ Thổ địa nay chỉ còn MỘT loại —
  // chính là một kho (`Warehouse`) — nên quyền tương ứng là:
  //   • xem bảng điểm            → `THO_DIA_VIEW`
  //   • sửa hồ sơ / ẩn / nổi bật → `THO_DIA_MANAGE`
  //   • duyệt đề xuất của người phụ trách → `THO_DIA_REVIEW`
  // và các mã kho (`WAREHOUSES_*`) cho phần vận hành kho.
  //
  // ⚠ Migration `20260907120000_gop_dia_diem_vao_kho` đã `DELETE` sáu dòng ấy
  // khỏi bảng `permissions` (cascade sang `role_permissions` 5 dòng). Khai lại
  // một mã cùng tên ở đây sẽ tạo một mã MỒ CÔI: enum TS có nó,
  // bảng `permissions` thì không, nên `@AnyPermission(...)` với mã đó từ chối MỌI
  // người dùng — kể cả quản trị viên cấp cao nhất — mà không một cổng nào đỏ.

  // ============================================================================
  // DIADIEM — Business Offers
  // ============================================================================
  BUSINESS_OFFERS_VIEW = 'business_offers.view',
  BUSINESS_OFFERS_CREATE = 'business_offers.create',
  BUSINESS_OFFERS_UPDATE = 'business_offers.update',
  BUSINESS_OFFERS_APPROVE = 'business_offers.approve',
  BUSINESS_OFFERS_REJECT = 'business_offers.reject',

  // ============================================================================
  // BUSINESS FORMS - Đăng ký doanh nghiệp (new-business)
  // ============================================================================
  BUSINESS_FORMS_VIEW = 'business_forms.view',
  BUSINESS_FORMS_CREATE = 'business_forms.create',
  BUSINESS_FORMS_UPDATE = 'business_forms.update',
  BUSINESS_FORMS_DELETE = 'business_forms.delete',
  BUSINESS_FORMS_APPROVE = 'business_forms.approve',
  BUSINESS_FORMS_APPROVE_OVERRIDE = 'business_forms.approve_override',
  BUSINESS_FORMS_REJECT = 'business_forms.reject',
  BUSINESS_FORMS_MANAGE = 'business_forms.manage',

  // ============================================================================
  // DAILY TASK GROUPS - Nhóm giao việc / nhóm báo cáo hằng ngày
  // ============================================================================
  DAILY_TASK_GROUPS_CREATE = 'daily_task_groups.create',

  // ============================================================================
  // DIADIEM — Location Reviews
  // ============================================================================
  LOCATION_REVIEWS_VIEW = 'location_reviews.view',
  LOCATION_REVIEWS_MODERATE = 'location_reviews.moderate',
  LOCATION_REVIEWS_DELETE = 'location_reviews.delete',

  // ============================================================================
  // DIADIEM — Location Reports
  // ============================================================================
  LOCATION_REPORTS_VIEW = 'location_reports.view',
  LOCATION_REPORTS_RESOLVE = 'location_reports.resolve',

  // ============================================================================
  // DIADIEM — Business Claims
  // ============================================================================
  BUSINESS_CLAIMS_VIEW = 'business_claims.view',
  BUSINESS_CLAIMS_APPROVE = 'business_claims.approve',
  BUSINESS_CLAIMS_REJECT = 'business_claims.reject',

  // ============================================================================
  // DIADIEM — QR Tokens
  // ============================================================================
  QR_MANAGE = 'qr.manage',
  QR_GENERATE_STATIC = 'qr.generate_static',
  QR_REVOKE = 'qr.revoke',

  // ============================================================================
  // DIADIEM — Entitlement Catalog
  // ============================================================================
  ENTITLEMENT_CATALOG_MANAGE = 'entitlement_catalog.manage',

  // ============================================================================
  // DIADIEM — Analytics
  // ============================================================================
  DIADIEM_ANALYTICS_VIEW = 'diadiem_analytics.view',

  // ============================================================================
  // WAREHOUSE MANAGER ASSIGNMENTS - Phân công quản lý kho
  // ============================================================================
  WAREHOUSE_MANAGER_ASSIGNMENTS_VIEW    = 'warehouse_manager_assignments.view',    // Xem danh sách phân công quản lý kho
  WAREHOUSE_MANAGER_ASSIGNMENTS_REQUEST = 'warehouse_manager_assignments.request', // Yêu cầu phân công quản lý kho
  WAREHOUSE_MANAGER_ASSIGNMENTS_APPROVE = 'warehouse_manager_assignments.approve', // Duyệt/từ chối phân công quản lý kho
  WAREHOUSE_MANAGER_ASSIGNMENTS_REVOKE  = 'warehouse_manager_assignments.revoke',  // Thu hồi phân công quản lý kho

  // ============================================================================
  // WAREHOUSE REPORTS - Báo cáo kho hằng ngày
  // ============================================================================
  WAREHOUSE_REPORTS_VIEW    = 'warehouse_reports.view',    // Xem lịch sử báo cáo kho
  WAREHOUSE_REPORTS_TRIGGER = 'warehouse_reports.trigger', // Kích hoạt gửi báo cáo kho thủ công
  WAREHOUSE_REPORTS_CONFIG  = 'warehouse_reports.config',  // Cấu hình báo cáo kho tự động

  // ============================================================================
  // MULTIVERSE
  // ============================================================================
  MULTIVERSE_VIEW              = 'multiverse.view',
  MISSION_VIEW                 = 'mission.view',
  MISSION_CLAIM                = 'mission.claim',
  MISSION_SUBMIT               = 'mission.submit',
  MISSION_VERIFY               = 'mission.verify',
  COMMUNITY_VIEW               = 'community.view',
  CHAT_SEND                    = 'community.chat.send',
  MEMBER_VIEW                  = 'member.view',
  MEMBER_LOCATION_VIEW         = 'member.location.view',
  MEMBER_LOCATION_VIEW_HIDDEN  = 'member.location.view_hidden',
  EMPLOYEE_VIEW_OWN            = 'employee.view_own',
  LOCATION_CHECKIN             = 'location.checkin',
  NOTIFICATION_PREFS_MANAGE    = 'notification.prefs.manage',
  AUDIT_LOG_WRITE              = 'admin.audit_log.write',
  WORKSPACE_ZONE_JOIN          = 'workspace.zone.join',
  LIVEKIT_TOKEN_ISSUE          = 'community.livekit.issue',

  // ============================================================================
  // COLLECTIONS - Quản lý bộ sưu tập sản phẩm
  // ============================================================================
  COLLECTION_VIEW   = 'collections.view',   // Xem bộ sưu tập
  COLLECTION_MANAGE = 'collections.manage',  // Quản lý bộ sưu tập

  // ============================================================================
  // RECOMMENDATIONS - Gợi ý cá nhân hoá (Phase 37.5)
  // ============================================================================
  // Gate cho admin "Quét & huấn luyện" recsys backfill. Canonical ở đây; bản
  // mirror trong acta-admin thuộc plan 37.5-08.
  RECOMMENDATIONS_MANAGE = 'recommendations.manage', // Quản lý & quét gợi ý cá nhân hoá

  // ============================================================================
  // LOYALTY_TIERS - Quản lý cấu hình tích điểm
  // ============================================================================
  LOYALTY_TIER_MANAGE = 'loyalty_tiers.manage', // Quản lý hạng tích điểm

  // ============================================================================
  // TRENDING_SEARCHES - Quản lý từ khóa "Đang được tìm nhiều" (storefront)
  // ============================================================================
  TRENDING_SEARCHES_MANAGE = 'trending_searches.manage', // Quản lý từ khóa tìm nhiều

  // ============================================================================
  // HOME_BRAND_LOGOS - Quản lý dải logo thương hiệu trang chủ (storefront)
  // ============================================================================
  // Quyền lẻ theo thao tác. Mã `.manage` bên dưới GIỮ NGUYÊN và vẫn được mọi
  // route chấp nhận: nó là quyền toàn nhóm mà ma trận phân quyền phía admin dựa
  // vào (`lib/permission-utils.ts` chỉ coi mã ĐÚNG 2 ĐOẠN kết thúc `.manage` là
  // quyền toàn nhóm), và là thứ giữ hiệu lực cho những ai đã được cấp trước khi
  // tách. Backend KHÔNG tự suy diễn `.manage` bao hàm quyền con —
  // `permission-hierarchy.util.ts` chỉ khai cứng 4 quan hệ, không có nhóm này —
  // nên mỗi route phải liệt kê tường minh cả mã lẻ lẫn mã toàn nhóm.
  HOME_BRAND_LOGOS_VIEW = 'home_brand_logos.view', // Xem dải logo trang chủ
  HOME_BRAND_LOGOS_CREATE = 'home_brand_logos.create', // Thêm logo
  HOME_BRAND_LOGOS_UPDATE = 'home_brand_logos.update', // Sửa logo, gồm bật/tắt
  HOME_BRAND_LOGOS_DELETE = 'home_brand_logos.delete', // Xóa logo
  HOME_BRAND_LOGOS_REORDER = 'home_brand_logos.reorder', // Sắp xếp thứ tự logo
  HOME_BRAND_LOGOS_CONFIG = 'home_brand_logos.config', // Chỉnh cấu hình dải
  HOME_BRAND_LOGOS_MANAGE = 'home_brand_logos.manage', // Toàn quyền dải logo

  // ============================================================================
  // BABYSITTER - Hệ thống babysitter
  // ============================================================================
  BABYSITTER_ACCESS = 'babysitter.access',

  // ============================================================================
  // INCOME_LOOKUP - Tra cứu thu nhập (cổng affiliate)
  // ============================================================================
  INCOME_LOOKUP_ACCESS = 'income_lookup.access',

  // ============================================================================
  // THIEN_SU_QUOTA - Hạn mức Thiên Sứ (thiensu.acta.vn) — acta-agents/docs/adr/0003
  // ============================================================================
  // CỐ Ý KHÔNG có mã `.manage`: ô "chọn cả nhóm" của ma trận phân quyền sẽ gộp
  // `exempt` với `update`, tức ai chỉnh được trần cũng tự miễn trần cho chính
  // mình mà không dòng nhật ký nào trông bất thường (HAN-MUC-VA-RAO-CHAN.md §6.1).
  THIEN_SU_QUOTA_VIEW = 'thien_su_quota.view', // Xem hạn mức, mô hình, sức khoẻ
  THIEN_SU_QUOTA_UPDATE = 'thien_su_quota.update', // Sửa hạn mức và danh mục mô hình
  THIEN_SU_QUOTA_EXEMPT = 'thien_su_quota.exempt', // BẢN THÂN được miễn hạn mức

}

/**
 * Default admin roles with their permission sets
 */
export const DEFAULT_ADMIN_ROLES = {
  SUPER_ADMIN: {
    code: 'super_admin',
    name: 'Super Admin',
    description: 'Toàn quyền quản trị hệ thống',
    level: 100,
    isSystem: true,
    color: '#dc2626', // red
    permissions: Object.values(PermissionCode), // All permissions
  },
  ORDER_MANAGER: {
    code: 'order_manager',
    name: 'Quản lý đơn hàng',
    description: 'Quản lý và xử lý đơn hàng',
    level: 50,
    isSystem: true,
    color: '#2563eb', // blue
    permissions: [
      PermissionCode.DASHBOARD_VIEW,
      PermissionCode.ORDERS_VIEW,
      PermissionCode.ORDERS_UPDATE,
      PermissionCode.ORDERS_MANAGE,
      PermissionCode.ORDERS_EXPORT,
      PermissionCode.PRODUCTS_VIEW,
      PermissionCode.INVENTORY_VIEW,
      PermissionCode.USERS_VIEW,
    ],
  },
  PRODUCT_MANAGER: {
    code: 'product_manager',
    name: 'Quản lý sản phẩm',
    description: 'Quản lý sản phẩm và danh mục',
    level: 50,
    isSystem: true,
    color: '#16a34a', // green
    permissions: [
      PermissionCode.DASHBOARD_VIEW,
      PermissionCode.PRODUCTS_VIEW,
      PermissionCode.PRODUCTS_CREATE,
      PermissionCode.PRODUCTS_UPDATE,
      PermissionCode.PRODUCTS_DELETE,
      PermissionCode.PRODUCTS_EXPORT,
      PermissionCode.PRODUCTS_IMPORT,
      PermissionCode.CATEGORIES_VIEW,
      PermissionCode.CATEGORIES_CREATE,
      PermissionCode.CATEGORIES_UPDATE,
      PermissionCode.INVENTORY_VIEW,
      PermissionCode.INVENTORY_UPDATE,
    ],
  },
  CONTENT_EDITOR: {
    code: 'content_editor',
    name: 'Biên tập nội dung',
    description: 'Quản lý nội dung và tin tức',
    level: 30,
    isSystem: true,
    color: '#9333ea', // purple
    permissions: [PermissionCode.DASHBOARD_VIEW, PermissionCode.CONTENT_MANAGE],
  },
  FINANCE_MANAGER: {
    code: 'finance_manager',
    name: 'Quản lý tài chính',
    description: 'Quản lý tài chính và thanh toán',
    level: 60,
    isSystem: true,
    color: '#ca8a04', // yellow
    permissions: [
      PermissionCode.DASHBOARD_VIEW,
      PermissionCode.DASHBOARD_ANALYTICS,
      PermissionCode.FINANCE_VIEW,
      PermissionCode.FINANCE_TRANSACTIONS,
      PermissionCode.FINANCE_REPORTS,
      PermissionCode.FINANCE_EXPORT,
      PermissionCode.FINANCE_MANAGE_PAYOUTS,
      PermissionCode.FINANCE_APPROVE_WITHDRAWALS,
      PermissionCode.AFFILIATE_VIEW,
      PermissionCode.AFFILIATE_APPROVE_WITHDRAWALS,
      PermissionCode.REPORTS_VIEW,
      PermissionCode.REPORTS_FINANCE,
    ],
  },
  AFFILIATE_MANAGER: {
    code: 'affiliate_manager',
    name: 'Quản lý Affiliate',
    description: 'Quản lý hệ thống affiliate và hoa hồng',
    level: 40,
    isSystem: true,
    color: '#0891b2', // cyan
    permissions: [
      PermissionCode.DASHBOARD_VIEW,
      PermissionCode.AFFILIATE_VIEW,
      PermissionCode.AFFILIATE_MANAGE_COMMISSIONS,
      PermissionCode.AFFILIATE_APPROVE_WITHDRAWALS,
      PermissionCode.AFFILIATE_VIEW_REPORTS,
      PermissionCode.USERS_VIEW,
      PermissionCode.REPORTS_VIEW,
    ],
  },
  VIEWER: {
    code: 'viewer',
    name: 'Chỉ xem',
    description: 'Chỉ có quyền xem, không thể chỉnh sửa',
    level: 10,
    isSystem: true,
    color: '#6b7280', // gray
    permissions: [
      PermissionCode.DASHBOARD_VIEW,
      PermissionCode.USERS_VIEW,
      PermissionCode.PRODUCTS_VIEW,
      PermissionCode.ORDERS_VIEW,
      PermissionCode.INVENTORY_VIEW,
      PermissionCode.REPORTS_VIEW,
      PermissionCode.REPORTS_ILLUMINATOR,
    ],
  },
  BUSINESS_TEAMS_MANAGER: {
    code: 'business_teams_manager',
    name: 'Quản lý đội nhóm nghiệp vụ',
    description: 'Quản lý đội nhóm nghiệp vụ',
    level: 50,
    isSystem: true,
    color: '#2563eb', // blue
    permissions: [
      PermissionCode.BUSINESS_TEAMS_VIEW,
      PermissionCode.BUSINESS_TEAMS_CREATE,
      PermissionCode.BUSINESS_TEAMS_UPDATE,
      PermissionCode.BUSINESS_TEAMS_DELETE,
      PermissionCode.BUSINESS_TEAMS_MANAGE,
    ],
  },
} as const;

/**
 * Permission definitions with metadata
 */
/**
 * Permission category for grouping
 */
export enum PermissionCategory {
  DASHBOARD = 'dashboard',
  USERS = 'users',
  PRODUCTS = 'products',
  PRODUCT_REVIEWS = 'product_reviews',
  BUSINESS_REVIEWS = 'business_reviews',
  CATEGORIES = 'categories',
  BUSINESSES = 'businesses',
  VOUCHERS = 'vouchers',
  ORDERS = 'orders',
  INVENTORY = 'inventory',
  WAREHOUSES = 'warehouses',
  FINANCE = 'finance',
  AFFILIATE = 'affiliate',
  MARKETING = 'marketing',
  CONTENT = 'content',
  REPORTS = 'reports',
  SETTINGS = 'settings',
  PERMISSIONS = 'permissions',
  BUSINESS_TEAMS = 'business_teams',
  MAINTENANCE = 'maintenance',
  BUSINESS_FORMS = 'business_forms',
  DAILY_TASK_GROUPS = 'daily_task_groups',
  BUG_REPORTS = 'bug_reports',
  BABYSITTER = 'babysitter',
  INCOME_LOOKUP = 'income_lookup',
  TECHNICAL_ACTIVITIES = 'technical_activities',
  TRAINING_VIDEOS = 'training_videos',
  SHRINE = 'shrine',
  THO_DIA = 'tho_dia',
  CONTRACTS = 'contracts',
  SALES_APP = 'sales_app',
  // Nhóm riêng, KHÔNG gộp vào MARKETING: ô tick "chọn cả nhóm" của ma trận tìm mã
  // toàn nhóm bằng cách so prefix của mã với category của nhóm
  // (`timQuyenToanNhom` trong acta-admin). Để category là `marketing` thì nó đi
  // tìm một mã `marketing.manage` không tồn tại, và 7 quyền logo bị trộn lẫn
  // giữa các quyền marketing khác.
  HOME_BRAND_LOGOS = 'home_brand_logos',
  // Trùng tiền tố mã (`thien_su_quota.*`) để ma trận nhóm đúng chỗ. Nhóm này
  // không có mã toàn nhóm — xem khối chú thích ở `PermissionCode`.
  THIEN_SU_QUOTA = 'thien_su_quota',
}

/**
 * Permission action types
 */
export enum PermissionAction {
  VIEW = 'view',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  EXPORT = 'export',
  IMPORT = 'import',
  APPROVE = 'approve',
  REJECT = 'reject',
  SUBMIT = 'submit',
  MANAGE = 'manage',
  ACCESS = 'access',
  REORDER = 'reorder',
  CONFIG = 'config',
}

export const PERMISSION_DEFINITIONS: Array<{
  code: PermissionCode;
  name: string;
  description: string;
  category: PermissionCategory;
  action: PermissionAction;
}> = [
  // Recommendations (Phase 37.5 — gợi ý cá nhân hoá)
  {
    code: PermissionCode.RECOMMENDATIONS_MANAGE,
    name: 'Quản lý gợi ý cá nhân hoá',
    description:
      'Quét & huấn luyện lại danh sách gợi ý cá nhân hoá cho khách hàng',
    category: PermissionCategory.MARKETING,
    action: PermissionAction.MANAGE,
  },
  // Dashboard
  {
    code: PermissionCode.DASHBOARD_VIEW,
    name: 'Xem trang tổng quan',
    description: 'Truy cập trang dashboard',
    category: PermissionCategory.DASHBOARD,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.DASHBOARD_ANALYTICS,
    name: 'Xem phân tích',
    description: 'Xem các biểu đồ và thống kê trên dashboard',
    category: PermissionCategory.DASHBOARD,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.DASHBOARD_MANAGE,
    name: 'Quản lý trang chủ',
    description:
      'Toàn quyền quản lý trang chủ (bao gồm tất cả quyền dashboard)',
    category: PermissionCategory.DASHBOARD,
    action: PermissionAction.MANAGE,
  },

  // Bug Reports — seeded statically (the /admin/bugs endpoint is public, so there
  // is no controller @Permissions decorator for discovery to pick up).
  {
    code: PermissionCode.BUG_REPORTS_VIEW,
    name: 'Xem báo cáo lỗi',
    description: 'Truy cập trang Báo cáo lỗi trong admin',
    category: PermissionCategory.BUG_REPORTS,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.BUG_REPORTS_MANAGE,
    name: 'Quản lý báo cáo lỗi',
    description: 'Toàn quyền Báo cáo lỗi: tạo, giao, xử lý, hoàn thành, bình luận',
    category: PermissionCategory.BUG_REPORTS,
    action: PermissionAction.MANAGE,
  },

  // ĐIỆN KIẾN CHỦ — BẮT BUỘC khai ở đây, không chỉ ở `enum PermissionCode`.
  // `PermissionDiscoveryService` dựng `validCodes` từ PERMISSION_DEFINITIONS +
  // các decorator quét được, rồi XOÁ mọi mã DB nằm ngoài tập đó kèm `deleteMany`
  // trên `user_permissions` và `role_permissions`. Mã chỉ nằm trong enum mà thiếu
  // ở đây là mất sạch phần gán quyền THẬT ngay lần khởi động kế tiếp.
  {
    code: PermissionCode.SHRINE_VIEW,
    name: 'Xem ĐIỆN KIẾN CHỦ',
    description:
      'Xem danh sách ngôi sao, trạng thái ghi danh, thống kê và lịch sử thay đổi của ĐIỆN KIẾN CHỦ.',
    category: PermissionCategory.SHRINE,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.SHRINE_MANAGE,
    name: 'Quản lý ĐIỆN KIẾN CHỦ',
    description:
      'Mời thành viên ghi danh, duyệt hoặc từ chối đơn xin ghi danh, sửa tên hiển thị trên ĐIỆN KIẾN CHỦ.',
    category: PermissionCategory.SHRINE,
    action: PermissionAction.MANAGE,
  },
  {
    code: PermissionCode.SHRINE_REVOKE,
    name: 'Thu hồi ngôi sao ĐIỆN KIẾN CHỦ',
    description:
      'Thu hồi một ngôi sao đã ghi danh: xoá tên hiển thị khỏi bản đồ công khai và trả ngôi sao về trạng thái vô chủ. Hành động phá huỷ, thành viên không tự hoàn tác được.',
    category: PermissionCategory.SHRINE,
    action: PermissionAction.DELETE,
  },

  // Thổ địa — khai TĨNH ở đây. Bộ dò quyền lúc khởi động XOÁ mọi mã trong DB
  // nằm ngoài (registry ∪ mã quét được từ decorator), kèm deleteMany trên
  // user_permissions/role_permissions. Mã chỉ có trong enum mà thiếu ở đây là
  // mất sạch phần gán quyền THẬT ngay lần khởi động kế tiếp.
  {
    code: PermissionCode.THO_DIA_VIEW,
    name: 'Xem Thổ địa',
    description:
      'Xem danh sách mọi điểm cầu đang hiển thị trên bản đồ acta-solutions và xem hàng đợi đề xuất cập nhật.',
    category: PermissionCategory.THO_DIA,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.THO_DIA_REVIEW,
    name: 'Duyệt cập nhật điểm cầu',
    description:
      'Duyệt hoặc từ chối đề xuất cập nhật hồ sơ công khai của một điểm cầu (tên hiển thị, mô tả, liên hệ, địa chỉ, toạ độ, giờ hoạt động, ảnh bìa và thư viện ảnh). Duyệt là ghi thẳng vào bản ghi khách đang nhìn thấy.',
    category: PermissionCategory.THO_DIA,
    action: PermissionAction.APPROVE,
  },
  {
    code: PermissionCode.THO_DIA_MANAGE,
    name: 'Sửa điểm trên bản đồ',
    description:
      'Tự tay sửa hồ sơ một điểm cầu ngay từ màn Bản đồ điểm, tạo điểm cầu mới, và bật/tắt việc điểm có hiện trên bản đồ công khai hay không. Khác với quyền duyệt: đây là ghi thẳng, không qua đề xuất của ai.',
    category: PermissionCategory.THO_DIA,
    action: PermissionAction.MANAGE,
  },
  {
    code: PermissionCode.THO_DIA_GHI_NHAN_DIEM_VIEW,
    name: 'Xem phiếu ghi nhận điểm',
    description:
      'Xem hàng đợi Phiếu ghi nhận điểm của điểm cầu: số tiền khách đã trả, ảnh chứng từ, số điểm sẽ cấp và trạng thái phí dịch vụ. Gồm cả nhóm đã thu phí nhưng bị từ chối — nhóm này kế toán phải hoàn tiền thủ công ngoài hệ thống nên bắt buộc phải tra ra được.',
    category: PermissionCategory.THO_DIA,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.THO_DIA_GHI_NHAN_DIEM_REVIEW,
    name: 'Duyệt phiếu ghi nhận điểm',
    description:
      'Duyệt hoặc từ chối Phiếu ghi nhận điểm. Duyệt là CẤP ĐIỂM THẬT cho khách, và điểm đó tính vào danh hiệu Cổ đông lan toả nên cuối cùng thành tiền chi ra. Cố ý tách khỏi quyền duyệt cập nhật điểm cầu: người trực bản đồ không đương nhiên được tạo ra điểm.',
    category: PermissionCategory.THO_DIA,
    action: PermissionAction.APPROVE,
  },
  {
    code: PermissionCode.THO_DIA_REVIEWS,
    name: 'Kiểm duyệt nội dung khách để lại',
    description:
      'Xem và xử lý đánh giá điểm cầu cùng báo cáo vi phạm do khách gửi. Gỡ một đánh giá là can thiệp vào tiếng nói của khách, nên tách khỏi quyền sửa hồ sơ điểm.',
    category: PermissionCategory.THO_DIA,
    action: PermissionAction.MANAGE,
  },

  // Hoạt động KTV — seeded statically (POST ingest dùng API key, không có
  // @Permissions decorator để discovery quét; GET dùng @AnyPermission).
  {
    code: PermissionCode.TECHNICAL_ACTIVITIES_VIEW,
    name: 'Xem hoạt động KTV',
    description: 'Truy cập trang Hoạt động KTV: commit, branch, tiến độ kỹ thuật',
    category: PermissionCategory.TECHNICAL_ACTIVITIES,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.TECHNICAL_ACTIVITIES_MANAGE,
    name: 'Quản lý hoạt động KTV',
    description: 'Toàn quyền Hoạt động KTV (bao gồm quyền xem)',
    category: PermissionCategory.TECHNICAL_ACTIVITIES,
    action: PermissionAction.MANAGE,
  },

  // Video rèn luyện — seeded statically để có tên + nhóm tiếng Việt trong UI
  // quản lý quyền (discovery từ @Permissions chỉ sinh code, không có tên đẹp).
  {
    code: PermissionCode.TRAINING_VIDEO_VIEW,
    name: 'Xem video rèn luyện',
    description: 'Xem danh sách và chi tiết video rèn luyện',
    category: PermissionCategory.TRAINING_VIDEOS,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.TRAINING_VIDEO_MANAGE,
    name: 'Quản lý video rèn luyện',
    description: 'Tạo, sửa, xuất bản, lưu trữ và xoá video rèn luyện',
    category: PermissionCategory.TRAINING_VIDEOS,
    action: PermissionAction.MANAGE,
  },

  // Duyệt video rèn luyện — cổng duyệt hai pha cho video đối tác (v1.5 Phase 49 HARD-09).
  // Seed tĩnh để có tên + nhóm tiếng Việt trong UI quản lý quyền.
  {
    code: PermissionCode.TRAINING_VIDEO_REVIEWS_VIEW,
    name: 'Xem duyệt video rèn luyện',
    description: 'Xem hàng đợi duyệt video rèn luyện của đối tác',
    category: PermissionCategory.TRAINING_VIDEOS,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.TRAINING_VIDEO_REVIEWS_SUBMIT,
    name: 'Gửi duyệt video rèn luyện',
    description: 'Đề xuất tạo/sửa/xoá video rèn luyện để chờ duyệt',
    category: PermissionCategory.TRAINING_VIDEOS,
    action: PermissionAction.SUBMIT,
  },
  {
    code: PermissionCode.TRAINING_VIDEO_REVIEWS_APPROVE,
    name: 'Phê duyệt video rèn luyện',
    description: 'Duyệt/từ chối đề xuất video rèn luyện (không tự duyệt bài của mình)',
    category: PermissionCategory.TRAINING_VIDEOS,
    action: PermissionAction.APPROVE,
  },
  {
    code: PermissionCode.TRAINING_VIDEO_REVIEWS_MANAGE,
    name: 'Quản lý duyệt video rèn luyện',
    description: 'Toàn quyền duyệt video rèn luyện (bao gồm xem, gửi, phê duyệt)',
    category: PermissionCategory.TRAINING_VIDEOS,
    action: PermissionAction.MANAGE,
  },

  // Users
  {
    code: PermissionCode.USERS_VIEW,
    name: 'Xem danh sách người dùng',
    description: 'Xem thông tin cơ bản của người dùng',
    category: PermissionCategory.USERS,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.USERS_CREATE,
    name: 'Tạo người dùng',
    description: 'Tạo tài khoản người dùng mới',
    category: PermissionCategory.USERS,
    action: PermissionAction.CREATE,
  },
  {
    code: PermissionCode.USERS_UPDATE,
    name: 'Cập nhật người dùng',
    description: 'Chỉnh sửa thông tin người dùng',
    category: PermissionCategory.USERS,
    action: PermissionAction.UPDATE,
  },
  {
    code: PermissionCode.USERS_DELETE,
    name: 'Xóa người dùng',
    description: 'Xóa tài khoản người dùng',
    category: PermissionCategory.USERS,
    action: PermissionAction.DELETE,
  },
  {
    code: PermissionCode.USERS_EXPORT,
    name: 'Xuất dữ liệu người dùng',
    description: 'Xuất danh sách người dùng ra file',
    category: PermissionCategory.USERS,
    action: PermissionAction.EXPORT,
  },
  {
    code: PermissionCode.USERS_MANAGE,
    name: 'Quản lý người dùng',
    description: 'Quản lý người dùng',
    category: PermissionCategory.USERS,
    action: PermissionAction.MANAGE,
  },
  {
    code: PermissionCode.USERS_VIEW_SENSITIVE,
    name: 'Xem thông tin nhạy cảm',
    description: 'Xem KYC, CCCD và thông tin nhạy cảm khác',
    category: PermissionCategory.USERS,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.USERS_ASSIGN_REFERRER,
    name: 'Gán người giới thiệu',
    description:
      'Gán người giới thiệu cho tài khoản đang bỏ trống hoặc đang do hệ thống tự gán. ' +
      'Thao tác này dời cả nhánh cấp dưới sang tuyến mới, nên ảnh hưởng hoa hồng về sau — ' +
      'cấp riêng, không đi kèm quyền quản lý người dùng.',
    category: PermissionCategory.USERS,
    action: PermissionAction.UPDATE,
  },

  // Products
  {
    code: PermissionCode.PRODUCTS_VIEW,
    name: 'Xem sản phẩm',
    description: 'Xem danh sách và chi tiết sản phẩm',
    category: PermissionCategory.PRODUCTS,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.PRODUCTS_CREATE,
    name: 'Tạo sản phẩm',
    description: 'Thêm sản phẩm mới',
    category: PermissionCategory.PRODUCTS,
    action: PermissionAction.CREATE,
  },
  {
    code: PermissionCode.PRODUCTS_UPDATE,
    name: 'Cập nhật sản phẩm',
    description: 'Chỉnh sửa thông tin sản phẩm',
    category: PermissionCategory.PRODUCTS,
    action: PermissionAction.UPDATE,
  },
  {
    code: PermissionCode.PRODUCTS_DELETE,
    name: 'Xóa sản phẩm',
    description: 'Xóa sản phẩm khỏi hệ thống',
    category: PermissionCategory.PRODUCTS,
    action: PermissionAction.DELETE,
  },
  {
    code: PermissionCode.PRODUCTS_EXPORT,
    name: 'Xuất dữ liệu sản phẩm',
    description: 'Xuất danh sách sản phẩm ra file',
    category: PermissionCategory.PRODUCTS,
    action: PermissionAction.EXPORT,
  },
  {
    code: PermissionCode.PRODUCTS_IMPORT,
    name: 'Nhập dữ liệu sản phẩm',
    description: 'Nhập sản phẩm từ file',
    category: PermissionCategory.PRODUCTS,
    action: PermissionAction.IMPORT,
  },
  {
    code: PermissionCode.PRODUCT_PRICING_MANAGE,
    name: 'Quản lý giá / thuế sản phẩm',
    description: 'Cho phép chỉnh sửa giá bán, giá vốn, thuế đầu vào và thuế đầu ra của sản phẩm sau khi sản phẩm đã được duyệt.',
    category: PermissionCategory.PRODUCTS,
    action: PermissionAction.MANAGE,
  },
  {
    code: PermissionCode.PRODUCT_PUBLISH_MANAGE,
    name: 'Mở bán / ngừng bán sản phẩm',
    description:
      'Cho phép bật tắt hai công tắc "Hoạt động" và "Mở bán" của sản phẩm (tab SEO & Khác). Người chỉ có quyền quản lý sản phẩm vẫn sửa được nội dung nhưng KHÔNG tự đưa sản phẩm lên bán được.',
    category: PermissionCategory.PRODUCTS,
    action: PermissionAction.MANAGE,
  },
  {
    code: PermissionCode.PRODUCT_PIN_MANAGE,
    name: 'Ghim sản phẩm',
    description:
      'Cho phép bật tắt công tắc "Ghim sản phẩm" (tab SEO & Khác). Sản phẩm được ghim nổi lên đầu mọi danh sách của trang bán hàng và được cộng điểm ưu tiên khi khách tìm kiếm. Quyền quản lý sản phẩm (products.manage) KHÔNG bao hàm quyền này.',
    category: PermissionCategory.PRODUCTS,
    action: PermissionAction.MANAGE,
  },

  // Product Reviews
  {
    code: PermissionCode.PRODUCT_REVIEWS_VIEW,
    name: 'Xem đánh giá sản phẩm',
    description: 'Xem danh sách và chi tiết đánh giá sản phẩm',
    category: PermissionCategory.PRODUCT_REVIEWS,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.PRODUCT_REVIEWS_SUBMIT,
    name: 'Gửi đánh giá sản phẩm',
    description: 'Tạo và gửi đánh giá sản phẩm mới',
    category: PermissionCategory.PRODUCT_REVIEWS,
    action: PermissionAction.CREATE,
  },
  {
    code: PermissionCode.PRODUCT_REVIEWS_APPROVE,
    name: 'Duyệt đánh giá sản phẩm',
    description: 'Phê duyệt hoặc từ chối đánh giá sản phẩm',
    category: PermissionCategory.PRODUCT_REVIEWS,
    action: PermissionAction.APPROVE,
  },
  {
    code: PermissionCode.PRODUCT_REVIEWS_MANAGE,
    name: 'Quản lý đánh giá sản phẩm',
    description:
      'Toàn quyền quản lý đánh giá sản phẩm (bao gồm tất cả quyền đánh giá)',
    category: PermissionCategory.PRODUCT_REVIEWS,
    action: PermissionAction.MANAGE,
  },

  // Business Reviews
  {
    code: PermissionCode.BUSINESS_REVIEWS_VIEW,
    name: 'Xem duyệt doanh nghiệp',
    description: 'View business review requests',
    category: PermissionCategory.BUSINESS_REVIEWS,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.BUSINESS_REVIEWS_SUBMIT,
    name: 'Gửi yêu cầu duyệt doanh nghiệp',
    description: 'Submit business review requests',
    category: PermissionCategory.BUSINESS_REVIEWS,
    action: PermissionAction.CREATE,
  },
  {
    code: PermissionCode.BUSINESS_REVIEWS_APPROVE,
    name: 'Duyệt doanh nghiệp',
    description: 'Approve or reject business review requests',
    category: PermissionCategory.BUSINESS_REVIEWS,
    action: PermissionAction.APPROVE,
  },
  {
    code: PermissionCode.BUSINESS_REVIEWS_MANAGE,
    name: 'Quản lý duyệt doanh nghiệp',
    description: 'Full management of business reviews',
    category: PermissionCategory.BUSINESS_REVIEWS,
    action: PermissionAction.MANAGE,
  },

  // Categories
  {
    code: PermissionCode.CATEGORIES_VIEW,
    name: 'Xem danh mục',
    description: 'Xem danh sách danh mục sản phẩm',
    category: PermissionCategory.CATEGORIES,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.CATEGORIES_CREATE,
    name: 'Tạo danh mục',
    description: 'Thêm danh mục mới',
    category: PermissionCategory.CATEGORIES,
    action: PermissionAction.CREATE,
  },
  {
    code: PermissionCode.CATEGORIES_UPDATE,
    name: 'Cập nhật danh mục',
    description: 'Chỉnh sửa thông tin danh mục',
    category: PermissionCategory.CATEGORIES,
    action: PermissionAction.UPDATE,
  },
  {
    code: PermissionCode.CATEGORIES_DELETE,
    name: 'Xóa danh mục',
    description: 'Xóa danh mục khỏi hệ thống',
    category: PermissionCategory.CATEGORIES,
    action: PermissionAction.DELETE,
  },

  // Business teams
  {
    code: PermissionCode.BUSINESS_TEAMS_VIEW,
    name: 'Xem đội nhóm nghiệp vụ',
    description: 'Xem danh sách đội nhóm nghiệp vụ',
    category: PermissionCategory.BUSINESS_TEAMS,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.BUSINESS_TEAMS_CREATE,
    name: 'Tạo đội nhóm nghiệp vụ',
    description: 'Tạo đội nhóm nghiệp vụ mới',
    category: PermissionCategory.BUSINESS_TEAMS,
    action: PermissionAction.CREATE,
  },
  {
    code: PermissionCode.BUSINESS_TEAMS_UPDATE,
    name: 'Cập nhật đội nhóm nghiệp vụ',
    description: 'Chỉnh sửa thông tin đội nhóm nghiệp vụ',
    category: PermissionCategory.BUSINESS_TEAMS,
    action: PermissionAction.UPDATE,
  },
  {
    code: PermissionCode.BUSINESS_TEAMS_DELETE,
    name: 'Xóa đội nhóm nghiệp vụ',
    description: 'Xóa đội nhóm nghiệp vụ khỏi hệ thống',
    category: PermissionCategory.BUSINESS_TEAMS,
    action: PermissionAction.DELETE,
  },
  {
    code: PermissionCode.BUSINESS_TEAMS_MANAGE,
    name: 'Quản lý đội nhóm nghiệp vụ',
    description: 'Quản lý đội nhóm nghiệp vụ',
    category: PermissionCategory.BUSINESS_TEAMS,
    action: PermissionAction.MANAGE,
  },
  // Orders
  {
    code: PermissionCode.ORDERS_VIEW,
    name: 'Xem đơn hàng',
    description: 'Xem danh sách và chi tiết đơn hàng',
    category: PermissionCategory.ORDERS,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.ORDERS_CREATE,
    name: 'Tạo đơn hàng',
    description: 'Tạo đơn hàng mới',
    category: PermissionCategory.ORDERS,
    action: PermissionAction.CREATE,
  },
  {
    code: PermissionCode.ORDERS_UPDATE,
    name: 'Cập nhật đơn hàng',
    description: 'Chỉnh sửa thông tin đơn hàng',
    category: PermissionCategory.ORDERS,
    action: PermissionAction.UPDATE,
  },
  {
    code: PermissionCode.ORDERS_DELETE,
    name: 'Xóa đơn hàng',
    description: 'Xóa đơn hàng khỏi hệ thống',
    category: PermissionCategory.ORDERS,
    action: PermissionAction.DELETE,
  },
  {
    code: PermissionCode.ORDERS_APPROVE,
    name: 'Duyệt đơn hàng',
    description: 'Phê duyệt đơn hàng',
    category: PermissionCategory.ORDERS,
    action: PermissionAction.APPROVE,
  },
  {
    code: PermissionCode.ORDERS_EXPORT,
    name: 'Xuất dữ liệu đơn hàng',
    description: 'Xuất danh sách đơn hàng ra file',
    category: PermissionCategory.ORDERS,
    action: PermissionAction.EXPORT,
  },
  {
    code: PermissionCode.ORDERS_MANAGE,
    name: 'Quản lý đơn hàng',
    description: 'Toàn quyền quản lý đơn hàng (bao gồm tất cả quyền đơn hàng)',
    category: PermissionCategory.ORDERS,
    action: PermissionAction.MANAGE,
  },
  {
    code: PermissionCode.ORDERS_PROCESS_REFUND,
    name: 'Xử lý hoàn tiền',
    description: 'Phê duyệt và xử lý yêu cầu hoàn tiền',
    category: PermissionCategory.ORDERS,
    action: PermissionAction.APPROVE,
  },
  {
    code: PermissionCode.ORDERS_VIEW_ALL,
    name: 'Xem tất cả đơn hàng',
    description: 'Xem đơn hàng từ tất cả các cửa hàng',
    category: PermissionCategory.ORDERS,
    action: PermissionAction.VIEW,
  },

  // Inventory
  {
    code: PermissionCode.INVENTORY_VIEW,
    name: 'Xem tồn kho',
    description: 'Xem thông tin tồn kho',
    category: PermissionCategory.INVENTORY,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.INVENTORY_UPDATE,
    name: 'Cập nhật tồn kho',
    description: 'Thay đổi số lượng tồn kho',
    category: PermissionCategory.INVENTORY,
    action: PermissionAction.UPDATE,
  },
  {
    code: PermissionCode.INVENTORY_TRANSFER,
    name: 'Chuyển kho',
    description: 'Chuyển hàng giữa các kho',
    category: PermissionCategory.INVENTORY,
    action: PermissionAction.MANAGE,
  },
  {
    code: PermissionCode.INVENTORY_ADJUST,
    name: 'Điều chỉnh tồn kho',
    description: 'Điều chỉnh số lượng tồn kho',
    category: PermissionCategory.INVENTORY,
    action: PermissionAction.MANAGE,
  },
  {
    code: PermissionCode.INVENTORY_EXPORT,
    name: 'Xuất dữ liệu tồn kho',
    description: 'Xuất báo cáo tồn kho ra file',
    category: PermissionCategory.INVENTORY,
    action: PermissionAction.EXPORT,
  },

  // Warehouses
  {
    code: PermissionCode.WAREHOUSES_VIEW,
    name: 'Xem kho hàng',
    description: 'Xem danh sách kho hàng',
    category: PermissionCategory.WAREHOUSES,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.WAREHOUSES_CREATE,
    name: 'Tạo kho hàng',
    description: 'Thêm kho hàng mới',
    category: PermissionCategory.WAREHOUSES,
    action: PermissionAction.CREATE,
  },
  {
    code: PermissionCode.WAREHOUSES_UPDATE,
    name: 'Cập nhật kho hàng',
    description: 'Chỉnh sửa thông tin kho hàng',
    category: PermissionCategory.WAREHOUSES,
    action: PermissionAction.UPDATE,
  },
  {
    code: PermissionCode.WAREHOUSES_DELETE,
    name: 'Xóa kho hàng',
    description: 'Xóa kho hàng khỏi hệ thống',
    category: PermissionCategory.WAREHOUSES,
    action: PermissionAction.DELETE,
  },
  {
    code: PermissionCode.WAREHOUSES_DEACTIVATE,
    name: 'Vô hiệu hoá kho hàng',
    description: 'Vô hiệu hoá kho hàng (không xoá) để tạm dừng hoạt động',
    category: PermissionCategory.WAREHOUSES,
    action: PermissionAction.MANAGE,
  },
  {
    code: PermissionCode.WAREHOUSES_MANAGE,
    name: 'Quản lý tất cả kho hàng',
    description:
      'Quyền quản lý đơn hàng từ tất cả các kho hàng (bỏ qua giới hạn kho cụ thể)',
    category: PermissionCategory.WAREHOUSES,
    action: PermissionAction.MANAGE,
  },

  // Purchase Orders — Quản lý nhập kho
  {
    code: PermissionCode.PURCHASE_ORDERS_VIEW,
    name: 'Xem đơn nhập hàng',
    description: 'Xem danh sách và chi tiết đơn nhập hàng (purchase order)',
    category: PermissionCategory.WAREHOUSES,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.PURCHASE_ORDERS_MANAGE,
    name: 'Quản lý đơn nhập hàng',
    description:
      'Tạo / sửa / nộp / nhận / huỷ đơn nhập hàng (không bao gồm duyệt)',
    category: PermissionCategory.WAREHOUSES,
    action: PermissionAction.MANAGE,
  },
  {
    code: PermissionCode.PURCHASE_ORDERS_APPROVE,
    name: 'Duyệt đơn nhập hàng',
    description:
      'Phê duyệt hoặc từ chối đơn nhập hàng đang chờ duyệt (cộng onOrder khi duyệt)',
    category: PermissionCategory.WAREHOUSES,
    action: PermissionAction.APPROVE,
  },

  // Finance
  {
    code: PermissionCode.FINANCE_VIEW,
    name: 'Xem tài chính',
    description: 'Xem thông tin tài chính cơ bản',
    category: PermissionCategory.FINANCE,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.FINANCE_TRANSACTIONS,
    name: 'Xem giao dịch',
    description: 'Xem lịch sử giao dịch',
    category: PermissionCategory.FINANCE,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.FINANCE_REPORTS,
    name: 'Xem báo cáo tài chính',
    description: 'Xem các báo cáo tài chính',
    category: PermissionCategory.FINANCE,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.FINANCE_EXPORT,
    name: 'Xuất dữ liệu tài chính',
    description: 'Xuất báo cáo tài chính ra file',
    category: PermissionCategory.FINANCE,
    action: PermissionAction.EXPORT,
  },
  {
    code: PermissionCode.FINANCE_MANAGE_PAYOUTS,
    name: 'Quản lý thanh toán',
    description: 'Quản lý các khoản thanh toán',
    category: PermissionCategory.FINANCE,
    action: PermissionAction.MANAGE,
  },
  {
    code: PermissionCode.FINANCE_APPROVE_WITHDRAWALS,
    name: 'Phê duyệt rút tiền',
    description: 'Phê duyệt yêu cầu rút tiền',
    category: PermissionCategory.FINANCE,
    action: PermissionAction.APPROVE,
  },
  {
    code: PermissionCode.ACCEPT_HALF_WALLET,
    name: 'Duyệt ví HALF',
    description:
      'Xem danh sách, bắt đầu xử lý, tải minh chứng và từ chối yêu cầu ví HALF',
    category: PermissionCategory.FINANCE,
    action: PermissionAction.APPROVE,
  },

  // Affiliate
  {
    code: PermissionCode.AFFILIATE_VIEW,
    name: 'Xem affiliate',
    description: 'Xem thông tin hệ thống affiliate',
    category: PermissionCategory.AFFILIATE,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.AFFILIATE_MANAGE_COMMISSIONS,
    name: 'Quản lý hoa hồng',
    description: 'Quản lý các khoản hoa hồng',
    category: PermissionCategory.AFFILIATE,
    action: PermissionAction.MANAGE,
  },
  {
    code: PermissionCode.AFFILIATE_APPROVE_WITHDRAWALS,
    name: 'Phê duyệt rút hoa hồng',
    description: 'Phê duyệt yêu cầu rút hoa hồng',
    category: PermissionCategory.AFFILIATE,
    action: PermissionAction.APPROVE,
  },
  {
    code: PermissionCode.AFFILIATE_VIEW_REPORTS,
    name: 'Xem báo cáo affiliate',
    description: 'Xem các báo cáo affiliate',
    category: PermissionCategory.AFFILIATE,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.AFFILIATE_MANAGE_RATES,
    name: 'Quản lý tỷ lệ hoa hồng',
    description: 'Thay đổi tỷ lệ hoa hồng',
    category: PermissionCategory.AFFILIATE,
    action: PermissionAction.MANAGE,
  },

  // Marketing
  {
    code: PermissionCode.MARKETING_VIEW,
    name: 'Xem marketing',
    description: 'Xem thông tin marketing',
    category: PermissionCategory.MARKETING,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.MARKETING_CREATE_CAMPAIGNS,
    name: 'Tạo chiến dịch',
    description: 'Tạo chiến dịch marketing mới',
    category: PermissionCategory.MARKETING,
    action: PermissionAction.CREATE,
  },
  {
    code: PermissionCode.MARKETING_MANAGE_VOUCHERS,
    name: 'Quản lý voucher',
    description: 'Quản lý mã giảm giá',
    category: PermissionCategory.MARKETING,
    action: PermissionAction.MANAGE,
  },
  {
    code: PermissionCode.MARKETING_MANAGE_DISCOUNTS,
    name: 'Quản lý khuyến mãi',
    description: 'Quản lý chương trình khuyến mãi',
    category: PermissionCategory.MARKETING,
    action: PermissionAction.MANAGE,
  },
  {
    code: PermissionCode.MARKETING_VIEW_ANALYTICS,
    name: 'Xem phân tích marketing',
    description: 'Xem thống kê hiệu quả marketing',
    category: PermissionCategory.MARKETING,
    action: PermissionAction.VIEW,
  },

  // Content
  {
    code: PermissionCode.CONTENT_VIEW,
    name: 'Xem nội dung',
    description: 'Xem danh sách nội dung',
    category: PermissionCategory.CONTENT,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.CONTENT_CREATE,
    name: 'Tạo nội dung',
    description: 'Tạo bài viết mới',
    category: PermissionCategory.CONTENT,
    action: PermissionAction.CREATE,
  },
  {
    code: PermissionCode.CONTENT_UPDATE,
    name: 'Cập nhật nội dung',
    description: 'Chỉnh sửa bài viết',
    category: PermissionCategory.CONTENT,
    action: PermissionAction.UPDATE,
  },
  {
    code: PermissionCode.CONTENT_DELETE,
    name: 'Xóa nội dung',
    description: 'Xóa bài viết',
    category: PermissionCategory.CONTENT,
    action: PermissionAction.DELETE,
  },
  {
    code: PermissionCode.CONTENT_APPROVE,
    name: 'Phê duyệt bài đăng',
    description: 'Phê duyệt bài đăng',
    category: PermissionCategory.CONTENT,
    action: PermissionAction.APPROVE,
  },
  {
    code: PermissionCode.CONTENT_SUBMIT,
    name: 'Nộp bài để duyệt',
    description: 'Nộp bài viết / chủ đề để chờ phê duyệt',
    category: PermissionCategory.CONTENT,
    action: PermissionAction.SUBMIT,
  },
  {
    code: PermissionCode.CONTENT_MANAGE,
    name: 'Quản lý bài đăng',
    description: 'Toàn quyền quản lý bài đăng (bao gồm tất cả quyền content)',
    category: PermissionCategory.CONTENT,
    action: PermissionAction.MANAGE,
  },

  // Reports
  {
    code: PermissionCode.REPORTS_VIEW,
    name: 'Xem báo cáo',
    description: 'Truy cập trang báo cáo',
    category: PermissionCategory.REPORTS,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.REPORTS_SALES,
    name: 'Xem báo cáo bán hàng',
    description: 'Xem thống kê bán hàng',
    category: PermissionCategory.REPORTS,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.REPORTS_USERS,
    name: 'Xem báo cáo người dùng',
    description: 'Xem thống kê người dùng',
    category: PermissionCategory.REPORTS,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.REPORTS_PRODUCTS,
    name: 'Xem báo cáo sản phẩm',
    description: 'Xem thống kê sản phẩm',
    category: PermissionCategory.REPORTS,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.REPORTS_FINANCE,
    name: 'Xem báo cáo tài chính',
    description: 'Xem thống kê tài chính',
    category: PermissionCategory.REPORTS,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.REPORTS_EXPORT,
    name: 'Xuất báo cáo',
    description: 'Xuất báo cáo ra file',
    category: PermissionCategory.REPORTS,
    action: PermissionAction.EXPORT,
  },

  // Settings
  {
    code: PermissionCode.SETTINGS_VIEW,
    name: 'Xem cài đặt',
    description: 'Xem cài đặt hệ thống',
    category: PermissionCategory.SETTINGS,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.SETTINGS_UPDATE,
    name: 'Cập nhật cài đặt',
    description: 'Thay đổi cài đặt hệ thống',
    category: PermissionCategory.SETTINGS,
    action: PermissionAction.UPDATE,
  },
  {
    code: PermissionCode.SETTINGS_MANAGE_BUSINESSES,
    name: 'Quản lý doanh nghiệp',
    description: 'Quản lý thông tin doanh nghiệp',
    category: PermissionCategory.SETTINGS,
    action: PermissionAction.MANAGE,
  },
  {
    code: PermissionCode.SETTINGS_MANAGE_INTEGRATIONS,
    name: 'Quản lý tích hợp',
    description: 'Quản lý các tích hợp bên ngoài',
    category: PermissionCategory.SETTINGS,
    action: PermissionAction.MANAGE,
  },
  {
    code: PermissionCode.SETTINGS_MANAGE_EMAILS,
    name: 'Quản lý email',
    description: 'Quản lý mẫu email và cài đặt',
    category: PermissionCategory.SETTINGS,
    action: PermissionAction.MANAGE,
  },

  // Permissions
  {
    code: PermissionCode.PERMISSIONS_VIEW,
    name: 'Xem phân quyền',
    description: 'Xem danh sách quyền và vai trò',
    category: PermissionCategory.PERMISSIONS,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.PERMISSIONS_MANAGE_ROLES,
    name: 'Quản lý vai trò',
    description: 'Tạo và chỉnh sửa vai trò',
    category: PermissionCategory.PERMISSIONS,
    action: PermissionAction.MANAGE,
  },
  {
    code: PermissionCode.PERMISSIONS_ASSIGN_USERS,
    name: 'Gán quyền cho người dùng',
    description: 'Gán vai trò và quyền cho người dùng',
    category: PermissionCategory.PERMISSIONS,
    action: PermissionAction.MANAGE,
  },
  {
    code: PermissionCode.PERMISSIONS_VIEW_AUDIT,
    name: 'Xem lịch sử phân quyền',
    description: 'Xem lịch sử thay đổi quyền',
    category: PermissionCategory.PERMISSIONS,
    action: PermissionAction.VIEW,
  },

  // Maintenance
  {
    code: PermissionCode.MAINTENANCE_VIEW,
    name: 'Xem bảo trì',
    description: 'Xem danh sách cửa sổ bảo trì',
    category: PermissionCategory.MAINTENANCE,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.MAINTENANCE_MANAGE,
    name: 'Quản lý bảo trì',
    description: 'Tạo, chỉnh sửa và xóa cửa sổ bảo trì',
    category: PermissionCategory.MAINTENANCE,
    action: PermissionAction.MANAGE,
  },

  // Business Registration Forms
  {
    code: PermissionCode.BUSINESS_FORMS_VIEW,
    name: 'Xem đơn đăng ký doanh nghiệp',
    description: 'Xem danh sách và chi tiết đơn đăng ký doanh nghiệp',
    category: PermissionCategory.BUSINESS_FORMS,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.BUSINESS_FORMS_CREATE,
    name: 'Tạo đơn đăng ký doanh nghiệp',
    description: 'Nộp đơn đăng ký doanh nghiệp mới',
    category: PermissionCategory.BUSINESS_FORMS,
    action: PermissionAction.CREATE,
  },
  {
    code: PermissionCode.BUSINESS_FORMS_UPDATE,
    name: 'Cập nhật đơn đăng ký doanh nghiệp',
    description: 'Chỉnh sửa đơn đăng ký doanh nghiệp',
    category: PermissionCategory.BUSINESS_FORMS,
    action: PermissionAction.UPDATE,
  },
  {
    code: PermissionCode.BUSINESS_FORMS_DELETE,
    name: 'Xóa đơn đăng ký doanh nghiệp',
    description: 'Xóa đơn đăng ký doanh nghiệp',
    category: PermissionCategory.BUSINESS_FORMS,
    action: PermissionAction.DELETE,
  },
  {
    code: PermissionCode.BUSINESS_FORMS_APPROVE,
    name: 'Duyệt đơn đăng ký doanh nghiệp',
    description: 'Phê duyệt đơn đăng ký doanh nghiệp',
    category: PermissionCategory.BUSINESS_FORMS,
    action: PermissionAction.APPROVE,
  },
  {
    code: PermissionCode.BUSINESS_FORMS_APPROVE_OVERRIDE,
    name: 'Duyệt đơn dù chưa đủ điều kiện',
    description:
      'Phê duyệt đơn đăng ký doanh nghiệp ngay cả khi chưa đạt tiêu chí kiểm tra (override). Yêu cầu xác nhận và ghi vào lịch sử.',
    category: PermissionCategory.BUSINESS_FORMS,
    action: PermissionAction.APPROVE,
  },
  {
    code: PermissionCode.BUSINESS_FORMS_REJECT,
    name: 'Từ chối đơn đăng ký doanh nghiệp',
    description: 'Từ chối đơn đăng ký doanh nghiệp',
    category: PermissionCategory.BUSINESS_FORMS,
    action: PermissionAction.REJECT,
  },
  {
    code: PermissionCode.BUSINESS_FORMS_MANAGE,
    name: 'Quản lý đơn đăng ký doanh nghiệp',
    description: 'Toàn quyền quản lý đơn đăng ký doanh nghiệp (bao gồm tất cả quyền business forms)',
    category: PermissionCategory.BUSINESS_FORMS,
    action: PermissionAction.MANAGE,
  },
  {
    code: PermissionCode.DAILY_TASK_GROUPS_CREATE,
    name: 'Tạo nhóm daily task',
    description:
      'Tạo nhóm gán nhanh và bật cấu hình báo cáo hằng ngày cho nhóm',
    category: PermissionCategory.DAILY_TASK_GROUPS,
    action: PermissionAction.CREATE,
  },
  // Hợp đồng — phát hành hợp đồng cho đối tác
  {
    code: PermissionCode.CONTRACTS_VIEW,
    name: 'Xem hợp đồng',
    description:
      'Mở mục "Hợp đồng": xem danh sách mẫu hợp đồng, xem trước bản mẫu và tra lịch sử đã phát hành cho ai. KHÔNG phát hành được.',
    category: PermissionCategory.CONTRACTS,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.CONTRACTS_MANAGE,
    name: 'Phát hành hợp đồng',
    description:
      'Phát hành hợp đồng cho đối tác: cấp số hợp đồng và tải file PDF/DOCX. Bao hàm cả quyền xem. Số hợp đồng đã cấp không thu hồi được.',
    category: PermissionCategory.CONTRACTS,
    action: PermissionAction.MANAGE,
  },
  // Babysitter
  {
    code: PermissionCode.BABYSITTER_ACCESS,
    name: 'Quyền babysitter',
    description: 'Người dùng có quyền này có thể nhận nuôi baby, quản lý task chăm sóc và nhận hoa hồng F3',
    category: PermissionCategory.BABYSITTER,
    action: PermissionAction.ACCESS,
  },
  // Tra cứu thu nhập — D5 2026-07-22: nhóm quyền RIÊNG, không gộp vào "Người chăm
  // sóc khách hàng" (người giới thiệu không phải babysitter).
  //
  // ⚠ SỬA TẠI CHỖ, KHÔNG BAO GIỜ xoá rồi thêm lại mục này: một mã nằm trong
  // `PermissionCode` mà thiếu ở mảng này bị `PermissionDiscoveryService` coi là mã
  // lạc và XOÁ khỏi bảng `permissions` kèm `deleteMany` cả `user_permissions` lẫn
  // `role_permissions` ngay lần khởi động CORE kế tiếp — quyền đã cấp cho người
  // thật biến mất, không cổng nào báo.
  //
  // 16/09/2026 — TẦM VỚI ĐÃ NỚI (quyết định chủ dự án). Mô tả phải nói đúng tầm với
  // MỚI: đây là dòng chữ DUY NHẤT mà người đi cấp quyền đọc được, nên để nguyên câu
  // "tuyến F1+F2 của họ hoặc danh sách đang chăm sóc" là khiến người ta cấp một
  // quyền toàn hệ thống mà tưởng mình đang cấp một quyền hẹp.
  {
    code: PermissionCode.INCOME_LOOKUP_ACCESS,
    name: 'Quyền tra cứu thu nhập',
    description:
      'Người dùng có quyền này tra cứu thu nhập của MỌI thành viên trong hệ thống (không giới hạn tuyến dưới hay danh sách chăm sóc): tìm theo tên / số điện thoại / mã giới thiệu / email, xem chính sách thu nhập qua góc nhìn của người đó và gửi hộ yêu cầu kết nạp. Bề mặt có ở cả trang "Tra cứu thu nhập" trên cổng affiliate lẫn màn tương ứng trong trang quản trị. Mỗi lượt mở góc nhìn của một thành viên đều được ghi vào Nhật ký hoạt động. Quyền này KHÔNG bao gồm nút "Đồng bộ TVTC toàn hệ thống" — nút đó vẫn chỉ super admin bấm được.',
    category: PermissionCategory.INCOME_LOOKUP,
    action: PermissionAction.ACCESS,
  },
  // App bán hàng tại điểm cầu ("ACTA Bán hàng", `vn.acta.sales`) — 21/08/2026.
  //
  // ⚠ VẾ SỐNG-CHẾT: một mã nằm trong `PermissionCode` mà THIẾU ở mảng này sẽ bị
  // `PermissionDiscoveryService` coi là mã lạc và XOÁ khỏi bảng `permissions`
  // kèm `deleteMany` trên `user_permissions` + `role_permissions` ngay lần khởi
  // động CORE kế tiếp. Quyền đã cấp cho người thật biến mất, không cổng nào báo.
  //
  // Vì sao phải có mã base `SALES_APP_MANAGE` thứ hai chứ không chỉ mã động:
  // `UserPermissionsResolverService.resolve` trả `new Set(Object.values(
  // PermissionCode))` cho `Role.admin` — tập đó CHỈ chứa mã TĨNH. Không có mã
  // base thì quản trị viên ra phạm vi RỖNG trên app bán hàng.
  {
    code: PermissionCode.SALES_APP_ACCESS,
    name: 'Dùng ứng dụng bán hàng',
    description:
      'Đăng nhập và tra cứu sản phẩm trên ứng dụng bán hàng tại điểm cầu. Đây là quyền ĐỌC: nó KHÔNG mở bất kỳ route ghi nào của kho, và KHÔNG thay cho quyền quản lý kho.',
    category: PermissionCategory.SALES_APP,
    action: PermissionAction.ACCESS,
  },
  {
    code: PermissionCode.SALES_APP_MANAGE,
    name: 'Bán hàng tại mọi điểm cầu',
    description:
      'Đứng tra cứu tại BẤT KỲ điểm cầu nào trên ứng dụng bán hàng. Nhân viên thường chỉ được cấp mã phạm vi từng điểm cầu (`sales_app.manage.{mã điểm cầu}`), không phải mã này.',
    category: PermissionCategory.SALES_APP,
    action: PermissionAction.MANAGE,
  },
  // Dải logo thương hiệu trang chủ storefront — tách quyền 03/09/2026.
  //
  // Trước đây nhóm này chỉ có mã `.manage` và KHÔNG có mục nào ở mảng này, nên
  // `PermissionDiscoveryService` tự sinh hàng với tên tiếng Anh
  // ("Home Brand Logos Manage") rồi không bao giờ sửa lại: vòng lặp upsert bỏ qua
  // mọi hàng đã tồn tại mà không phải mã tĩnh. Khai ở đây làm mã trở thành tĩnh,
  // nên nhánh cập nhật ghi đè name/description/category/action ở MỖI lần khởi
  // động và hàng cũ sai tên tự được chữa, không cần thao tác dữ liệu.
  {
    code: PermissionCode.HOME_BRAND_LOGOS_VIEW,
    name: 'Xem dải logo thương hiệu',
    description:
      'Xem danh sách logo thương hiệu trang chủ và cấu hình dải. Quyền ĐỌC: không mở bất kỳ thao tác ghi nào.',
    category: PermissionCategory.HOME_BRAND_LOGOS,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.HOME_BRAND_LOGOS_CREATE,
    name: 'Thêm logo thương hiệu',
    description:
      'Tải lên và thêm logo thương hiệu mới vào dải chạy ngang trên trang chủ.',
    category: PermissionCategory.HOME_BRAND_LOGOS,
    action: PermissionAction.CREATE,
  },
  {
    code: PermissionCode.HOME_BRAND_LOGOS_UPDATE,
    name: 'Sửa logo thương hiệu',
    description:
      'Sửa tên, ảnh, liên kết, hàng của một logo, và bật/tắt hiển thị từng logo.',
    category: PermissionCategory.HOME_BRAND_LOGOS,
    action: PermissionAction.UPDATE,
  },
  {
    code: PermissionCode.HOME_BRAND_LOGOS_DELETE,
    name: 'Xóa logo thương hiệu',
    description:
      'Xóa hẳn một logo khỏi dải. Tệp ảnh trên UploadThing không bị xóa theo.',
    category: PermissionCategory.HOME_BRAND_LOGOS,
    action: PermissionAction.DELETE,
  },
  {
    code: PermissionCode.HOME_BRAND_LOGOS_REORDER,
    name: 'Sắp xếp logo thương hiệu',
    description:
      'Đổi thứ tự các logo trong cùng một hàng. Không đổi được hàng của logo — việc đó thuộc quyền sửa.',
    category: PermissionCategory.HOME_BRAND_LOGOS,
    action: PermissionAction.REORDER,
  },
  {
    code: PermissionCode.HOME_BRAND_LOGOS_CONFIG,
    name: 'Chỉnh cấu hình dải logo',
    description:
      'Bật/tắt toàn bộ dải trên trang chủ và chỉnh tốc độ chạy của hai hàng. Ảnh hưởng trực tiếp giao diện trang chủ nên tách khỏi quyền thêm/sửa từng logo.',
    category: PermissionCategory.HOME_BRAND_LOGOS,
    action: PermissionAction.CONFIG,
  },
  {
    code: PermissionCode.HOME_BRAND_LOGOS_MANAGE,
    name: 'Quản lý logo thương hiệu trang chủ',
    description:
      'Toàn quyền với dải logo: xem, thêm, sửa, xóa, sắp xếp và chỉnh cấu hình. Cấp mã này là cấp gọn cả 6 quyền lẻ ở trên.',
    category: PermissionCategory.HOME_BRAND_LOGOS,
    action: PermissionAction.MANAGE,
  },
  // Thiên Sứ — hạn mức (17/09/2026). ⚠ VẾ SỐNG-CHẾT như mọi mục khác ở mảng này:
  // mã có trong `PermissionCode` mà thiếu ở đây sẽ bị `PermissionDiscoveryService`
  // XOÁ kèm mọi lượt cấp ở lần khởi động CORE kế tiếp.
  {
    code: PermissionCode.THIEN_SU_QUOTA_VIEW,
    name: 'Xem hạn mức Thiên Sứ',
    description:
      'Mở mục "Thiên Sứ" trong trang quản trị: xem hạn mức theo hạng người dùng, danh mục mô hình, nhật ký thay đổi và bảng sức khoẻ (số lần chặn, chi phí ước tính trong ngày). Quyền ĐỌC: không sửa được gì.',
    category: PermissionCategory.THIEN_SU_QUOTA,
    action: PermissionAction.VIEW,
  },
  {
    code: PermissionCode.THIEN_SU_QUOTA_UPDATE,
    name: 'Sửa hạn mức Thiên Sứ',
    description:
      'Sửa hạn mức trò chuyện theo hạng người dùng, ngân sách an toàn trong ngày, hệ số mức suy nghĩ, và bật/tắt hay chỉnh giá từng mô hình. Thay đổi có hiệu lực NGAY với mọi người đang dùng và được ghi vào nhật ký. Quyền này KHÔNG miễn hạn mức cho chính người được cấp.',
    category: PermissionCategory.THIEN_SU_QUOTA,
    action: PermissionAction.UPDATE,
  },
  {
    code: PermissionCode.THIEN_SU_QUOTA_EXEMPT,
    name: 'Miễn hạn mức Thiên Sứ',
    description:
      'Người được cấp trò chuyện với Thiên Sứ không bị giới hạn lượt theo ngày, theo 5 phút hay ngân sách hệ thống. Mọi lượt của họ vẫn được ghi đủ chi phí vào sổ. Không mở màn chỉnh hạn mức — đó là quyền riêng.',
    category: PermissionCategory.THIEN_SU_QUOTA,
    action: PermissionAction.ACCESS,
  },
];
