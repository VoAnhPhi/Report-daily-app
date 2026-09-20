'use client';

import { useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import { uploadFiles } from '@/lib/uploadthing';
import { convertHeicToJpeg } from '@/lib/heic-converter';
import { CameraCapture } from '@/components/kyc/camera-capture';
import { Camera, FileCheck, Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { BusinessFormValues } from '../schemas/business-form.schema';
import {
  BUSINESS_FORM_ERROR,
  BUSINESS_FORM_SUCCESS,
} from '../constants/messages';
import {
  LegalDocPreviewModal,
  type PreviewItem,
} from './legal-doc-preview-modal';

type DocFieldKey =
  | 'gpkdFileUrl'
  | 'congBoSpFileUrl'
  | 'kiemNghiemFileUrl'
  | 'nhanSpFileUrl'
  | 'maVachFileUrl'
  | 'tccsFileUrl'
  | 'coFileUrl'
  | 'dangKyNhFileUrl'
  | 'gmpFileUrl'
  | 'otherDocFileUrl';

type DocField = { key: DocFieldKey; label: string };

type LegalDocEntry = { url: string; note?: string };

const DOC_FIELDS: DocField[] = [
  { key: 'gpkdFileUrl', label: 'Giấy đăng ký kinh doanh' },
  { key: 'congBoSpFileUrl', label: 'Bản công bố / tự công bố sản phẩm' },
  { key: 'kiemNghiemFileUrl', label: 'Phiếu kết quả kiểm nghiệm' },
  { key: 'nhanSpFileUrl', label: 'Nhãn sản phẩm mẫu' },
  { key: 'maVachFileUrl', label: 'Giấy chứng nhận mã số mã vạch' },
  { key: 'tccsFileUrl', label: 'Tiêu chuẩn cơ sở (TCCS)' },
  { key: 'coFileUrl', label: 'Chứng nhận nguồn gốc (C/O)' },
  { key: 'dangKyNhFileUrl', label: 'Đăng ký nhãn hiệu' },
  { key: 'gmpFileUrl', label: 'Chứng nhận GMP' },
  { key: 'otherDocFileUrl', label: 'Tài liệu khác' },
];

const MAX_FILES_PER_SLOT = 10;

const isAcceptedFile = (file: File) => {
  const isPdf = file.type === 'application/pdf';
  const isImage = file.type.startsWith('image/');
  const isZip =
    file.type === 'application/zip' ||
    file.type === 'application/x-zip-compressed';
  return isPdf || isImage || isZip;
};

interface LegalDocUploadsProps {
  disabled?: boolean;
}

export function LegalDocUploads({ disabled }: LegalDocUploadsProps) {
  const form = useFormContext<BusinessFormValues>();
  const [uploadingKey, setUploadingKey] = useState<DocFieldKey | null>(null);
  const [cameraKey, setCameraKey] = useState<DocFieldKey | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetKeyRef = useRef<DocFieldKey | null>(null);

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<File[]>([]);
  const [previewKey, setPreviewKey] = useState<DocFieldKey | null>(null);

  const getCurrentEntries = (key: DocFieldKey): LegalDocEntry[] =>
    (form.getValues(key) as LegalDocEntry[] | undefined) ?? [];

  const appendEntries = (key: DocFieldKey, entries: LegalDocEntry[]) => {
    const current = getCurrentEntries(key);
    form.setValue(key, [...current, ...entries], {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const removeAt = (key: DocFieldKey, idx: number) => {
    const current = getCurrentEntries(key);
    form.setValue(
      key,
      current.filter((_, i) => i !== idx),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  // Convert HEIC files, upload to legalDocs, return {url, note}[] paired with notes.
  const uploadAndAppend = async (
    key: DocFieldKey,
    items: PreviewItem[],
  ) => {
    setUploadingKey(key);
    try {
      const converted: File[] = [];
      for (const { file } of items) {
        if (file.type.startsWith('image/')) {
          try {
            converted.push(await convertHeicToJpeg(file));
          } catch (err: unknown) {
            const msg =
              err instanceof Error
                ? err.message
                : BUSINESS_FORM_ERROR.heicConversion;
            toast.error(msg);
            return;
          }
        } else {
          converted.push(file);
        }
      }

      const res = await uploadFiles('legalDocs', { files: converted });
      const entries: LegalDocEntry[] = (res ?? [])
        .map((r, i) => {
          const url = r.ufsUrl ?? r.url;
          return url ? { url, note: items[i]?.note || undefined } : null;
        })
        .filter((e): e is NonNullable<typeof e> => e !== null);

      if (entries.length === 0) throw new Error('Upload failed: no URL returned');
      appendEntries(key, entries);
      toast.success(BUSINESS_FORM_SUCCESS.uploadFile);
    } catch (err) {
      console.error('Legal doc upload error:', err);
      toast.error(BUSINESS_FORM_ERROR.upload);
    } finally {
      setUploadingKey(null);
    }
  };

  const handlePickFileFor = (key: DocFieldKey) => {
    targetKeyRef.current = key;
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    const key = targetKeyRef.current;
    e.target.value = '';
    if (selected.length === 0 || !key) return;

    const valid = selected.filter(isAcceptedFile);
    if (valid.length < selected.length) {
      toast.error(BUSINESS_FORM_ERROR.invalidFileType);
    }
    if (valid.length === 0) return;

    const current = getCurrentEntries(key);
    const remaining = MAX_FILES_PER_SLOT - current.length;
    if (remaining <= 0) {
      toast.error(`Tối đa ${MAX_FILES_PER_SLOT} file mỗi mục`);
      return;
    }
    const toPreview = valid.slice(0, remaining);
    if (toPreview.length < valid.length) {
      toast.error(`Tối đa ${MAX_FILES_PER_SLOT} file mỗi mục`);
    }

    // Open preview modal instead of uploading immediately.
    setPreviewFiles(toPreview);
    setPreviewKey(key);
    setPreviewOpen(true);
  };

  const handlePreviewConfirm = async (items: PreviewItem[]) => {
    const key = previewKey;
    setPreviewOpen(false);
    setPreviewFiles([]);
    setPreviewKey(null);
    if (!key || items.length === 0) return;
    await uploadAndAppend(key, items);
  };

  const handlePreviewCancel = () => {
    setPreviewOpen(false);
    setPreviewFiles([]);
    setPreviewKey(null);
  };

  // Camera: append with empty note directly (no modal needed for single capture).
  const handleCameraCapture = async (file: File) => {
    const key = cameraKey;
    if (!key) return;
    const current = getCurrentEntries(key);
    if (current.length >= MAX_FILES_PER_SLOT) {
      toast.error(`Tối đa ${MAX_FILES_PER_SLOT} file mỗi mục`);
      setCameraKey(null);
      return;
    }
    setCameraKey(null);
    await uploadAndAppend(key, [{ file, note: '' }]);
    toast.success(BUSINESS_FORM_SUCCESS.captureFile);
  };

  return (
    <>
      <div className="space-y-4">
        <p className="text-sm font-medium text-zinc-700">
          Hồ sơ pháp lý{' '}
          <span className="text-muted-foreground text-xs">
            (không bắt buộc)
          </span>
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DOC_FIELDS.map(({ key, label }) => {
            const entries = (form.watch(key) as LegalDocEntry[] | undefined) ?? [];
            const isUploading = uploadingKey === key;
            const anyUploading = uploadingKey !== null;
            const atLimit = entries.length >= MAX_FILES_PER_SLOT;

            return (
              <div
                key={key}
                className="rounded-lg border bg-zinc-50 p-3 space-y-2"
              >
                <Label className="text-xs font-medium text-zinc-700 block">
                  {label}
                </Label>

                {entries.length > 0 && (
                  <div className="space-y-1.5">
                    {entries.map((entry, idx) => (
                      <div
                        key={`${entry.url}-${idx}`}
                        className="rounded-md border border-green-200 bg-white px-2 py-1.5 space-y-0.5"
                      >
                        <div className="flex items-center gap-2">
                          <FileCheck className="h-4 w-4 text-green-600 shrink-0" />
                          <a
                            href={entry.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-xs text-blue-600 underline truncate"
                          >
                            Xem file {idx + 1}
                          </a>
                          {!disabled && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 hover:bg-red-50"
                              onClick={() => removeAt(key, idx)}
                            >
                              <X className="h-3 w-3 text-red-500" />
                            </Button>
                          )}
                        </div>
                        {entry.note && (
                          <p className="text-[11px] text-zinc-500 pl-6 leading-snug">
                            {entry.note}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {isUploading ? (
                  <div className="flex items-center justify-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-2 py-2 text-xs text-blue-700">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Đang tải lên...
                  </div>
                ) : disabled ? (
                  entries.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      Chưa có file
                    </p>
                  ) : null
                ) : (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      disabled={anyUploading || atLimit}
                      onClick={() => handlePickFileFor(key)}
                    >
                      <Upload className="mr-1 h-3 w-3" />
                      Chọn file
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                      disabled={anyUploading || atLimit}
                      onClick={() => setCameraKey(key)}
                    >
                      <Camera className="mr-1 h-3 w-3" />
                      Chụp ảnh
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          Hỗ trợ PDF, ảnh (JPG, PNG, HEIC) hoặc ZIP. Tối đa 64MB mỗi file, tối đa{' '}
          {MAX_FILES_PER_SLOT} file mỗi mục.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/*,application/zip,.zip"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      <LegalDocPreviewModal
        open={previewOpen}
        files={previewFiles}
        onConfirm={handlePreviewConfirm}
        onCancel={handlePreviewCancel}
      />

      {cameraKey && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onCancel={() => setCameraKey(null)}
          title="Chụp ảnh hồ sơ"
          instructions={[
            'Đặt hồ sơ trong khung hình',
            'Đảm bảo ảnh rõ nét và đầy đủ thông tin',
            'Nhấn nút chụp để chụp ảnh',
          ]}
          aspectRatio="document"
        />
      )}
    </>
  );
}
