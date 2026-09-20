import { z } from 'zod';

// Client-side: validate the raw string input (normalization happens on server too).
// We validate the cleaned form but don't transform so RHF type stays string.
export const mstSchema = z
  .string()
  .min(1, 'Mã số thuế là bắt buộc')
  // Mã số thuế: 8–13 ký tự, gồm chữ và/hoặc số — áp dụng cho cả doanh nghiệp
  // lẫn cá nhân. (Tra cứu VietQR vẫn chỉ chạy với mã số 10/13 chữ số.)
  // Lọc ký tự không phải chữ/số trước khi kiểm tra: .trim() không bỏ được các
  // ký tự Unicode vô hình (U+202D/U+202C khi copy-paste) nên dễ báo lỗi giả.
  .refine((v) => /^[A-Za-z0-9]{8,13}$/.test(v.replace(/[^A-Za-z0-9]/g, '')), {
    message: 'Mã số thuế gồm 8–13 ký tự (chữ hoặc số)',
  });

export const vnPhoneSchema = z
  .string()
  .min(1, 'Số điện thoại là bắt buộc')
  .regex(/^(\+84|0)\d{9,10}$/, 'Số điện thoại gồm 10 chữ số');

const legalDocFileSchema = z.object({
  url: z.string().min(1),
  note: z.string().max(500).optional().or(z.literal('')),
});
const legalDocFilesSchema = z.array(legalDocFileSchema).max(10).optional();

export const productRowSchema = z.object({
  name: z.string().min(1, 'Tên sản phẩm là bắt buộc'),
  // valueAsNumber: true on the <Input type="number"> already gives RHF a number,
  // so we don't need z.coerce.number() (which would make the schema's input
  // type `unknown` and break the resolver typing under useForm<BusinessFormValues>).
  price: z.number({ message: 'Giá phải là số' }).min(0, 'Giá phải >= 0'),
  imageUrl: z.string().optional().or(z.literal('')),
});

// One free-form attachment row. `fileUrl` empty = unfilled row that we filter
// out before submission; superRefine below enforces label-when-file.
export const attachmentRowSchema = z.object({
  label: z.string().max(200).optional().or(z.literal('')),
  fileUrl: z.string().optional().or(z.literal('')),
  note: z.string().max(1000).optional().or(z.literal('')),
});

export const businessFormSchema = z
  .object({
    // Đánh dấu đăng ký bằng MST cá nhân: bỏ qua tra cứu VietQR + check trùng MST.
    // Không dùng `.default()` để giữ field non-optional ở input lẫn output (RHF
    // resolver typing) — giá trị mặc định `false` được đặt trong defaultValues.
    isIndividual: z.boolean(),
    companyName: z.string().min(1, 'Tên công ty là bắt buộc'),
    taxCode: mstSchema,
    address: z.string().min(1, 'Địa chỉ là bắt buộc'),
    contactName: z.string().min(1, 'Tên người liên lạc là bắt buộc'),
    contactPhone: vnPhoneSchema,
    description: z.string().max(4000).optional().or(z.literal('')),
    productInfo: z.string().max(4000).optional().or(z.literal('')),
    gpkdFileUrl: legalDocFilesSchema,
    congBoSpFileUrl: legalDocFilesSchema,
    kiemNghiemFileUrl: legalDocFilesSchema,
    nhanSpFileUrl: legalDocFilesSchema,
    maVachFileUrl: legalDocFilesSchema,
    tccsFileUrl: legalDocFilesSchema,
    coFileUrl: legalDocFilesSchema,
    dangKyNhFileUrl: legalDocFilesSchema,
    gmpFileUrl: legalDocFilesSchema,
    otherDocFileUrl: legalDocFilesSchema,
    products: z.array(productRowSchema).optional(),
    attachments: z.array(attachmentRowSchema).optional(),
  })
  .superRefine((values, ctx) => {
    // Each attachment row that has a fileUrl must also have a label.
    (values.attachments ?? []).forEach((row, idx) => {
      const hasFile = (row.fileUrl ?? '').trim().length > 0;
      const hasLabel = (row.label ?? '').trim().length > 0;
      if (hasFile && !hasLabel) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['attachments', idx, 'label'],
          message: 'Vui lòng nhập tên / nhãn cho file',
        });
      }
    });
  });

export type BusinessFormValues = z.infer<typeof businessFormSchema>;
