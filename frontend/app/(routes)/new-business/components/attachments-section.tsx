'use client';

import { useRef, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Camera,
  FileCheck,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { uploadFiles } from '@/lib/uploadthing';
import { convertHeicToJpeg } from '@/lib/heic-converter';
import { CameraCapture } from '@/components/kyc/camera-capture';
import type { BusinessFormValues } from '../schemas/business-form.schema';
import {
  BUSINESS_FORM_ERROR,
  BUSINESS_FORM_SUCCESS,
} from '../constants/messages';

interface AttachmentsSectionProps {
  disabled?: boolean;
  title: string;
  helper: string;
  /** If true, the section heading shows a "* bắt buộc" hint. */
  required?: boolean;
}

export function AttachmentsSection({
  disabled,
  title,
  helper,
  required,
}: AttachmentsSectionProps) {
  const form = useFormContext<BusinessFormValues>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'attachments',
  });

  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [cameraIndex, setCameraIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetIndexRef = useRef<number | null>(null);

  const persist = async (index: number, file: File, successMsg: string) => {
    setUploadingIndex(index);
    try {
      let toUpload = file;
      if (file.type.startsWith('image/')) {
        try {
          toUpload = await convertHeicToJpeg(file);
        } catch (err: unknown) {
          const msg =
            err instanceof Error
              ? err.message
              : BUSINESS_FORM_ERROR.heicConversion;
          toast.error(msg);
          return;
        }
      }
      const res = await uploadFiles('legalDocs', { files: [toUpload] });
      const url = res?.[0]?.ufsUrl ?? res?.[0]?.url;
      if (!url) throw new Error('Upload failed: no URL returned');
      form.setValue(`attachments.${index}.fileUrl`, url, {
        shouldDirty: true,
        shouldValidate: true,
      });
      // If the user hasn't typed a label yet, default to the file name to
      // save them a step.
      const currentLabel = form.getValues(`attachments.${index}.label`) ?? '';
      if (currentLabel.trim().length === 0) {
        form.setValue(`attachments.${index}.label`, file.name, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
      toast.success(successMsg);
    } catch (err) {
      console.error('Attachment upload error:', err);
      toast.error(BUSINESS_FORM_ERROR.upload);
    } finally {
      setUploadingIndex(null);
    }
  };

  const handlePickFileFor = (index: number) => {
    targetIndexRef.current = index;
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    const index = targetIndexRef.current;
    e.target.value = '';
    if (!file || index === null) return;

    const isPdf = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');
    const isZip = file.type === 'application/zip' || file.type === 'application/x-zip-compressed';
    if (!isPdf && !isImage && !isZip) {
      toast.error(BUSINESS_FORM_ERROR.invalidFileType);
      return;
    }

    await persist(index, file, BUSINESS_FORM_SUCCESS.uploadFile);
  };

  const handleCameraCapture = async (file: File) => {
    const index = cameraIndex;
    if (index === null) return;
    await persist(index, file, BUSINESS_FORM_SUCCESS.captureFile);
    setCameraIndex(null);
  };

  const sectionError = form.formState.errors.attachments;

  return (
    <>
      <div className='space-y-3'>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <p className='text-sm font-medium text-zinc-700'>
              {title}{' '}
              {required ? (
                <span className='text-red-500'>*</span>
              ) : (
                <span className='text-muted-foreground text-xs'>
                  (không bắt buộc)
                </span>
              )}
            </p>
            <p className='text-xs text-muted-foreground mt-0.5'>{helper}</p>
          </div>
          {!disabled && (
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='shrink-0'
              onClick={() => append({ label: '', fileUrl: '', note: '' })}
            >
              <Plus className='mr-1 h-3 w-3' />
              Thêm file
            </Button>
          )}
        </div>

        {fields.length === 0 && (
          <p className='text-xs text-muted-foreground italic'>
            Chưa có file nào. Bấm "Thêm file" để bắt đầu.
          </p>
        )}

        <div className='space-y-3'>
          {fields.map((field, index) => {
            const url = form.watch(`attachments.${index}.fileUrl`);
            const isUploading = uploadingIndex === index;
            const anyUploading = uploadingIndex !== null;
            const labelError =
              form.formState.errors.attachments?.[index]?.label?.message;

            return (
              <div
                key={field.id}
                className='rounded-lg border bg-zinc-50 p-3 space-y-3'
              >
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-medium text-zinc-600'>
                    File #{index + 1}
                  </span>
                  {!disabled && (
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='h-6 w-6 text-red-500 hover:text-red-700'
                      onClick={() => remove(index)}
                    >
                      <Trash2 className='h-3.5 w-3.5' />
                    </Button>
                  )}
                </div>

                <div className='space-y-1'>
                  <Label className='text-xs'>File</Label>
                  {url ? (
                    <div className='flex items-center gap-2 rounded-md border border-green-200 bg-white px-2 py-1.5'>
                      <FileCheck className='h-4 w-4 shrink-0 text-green-600' />
                      <a
                        href={url}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='flex-1 truncate text-xs text-blue-600 underline'
                      >
                        Xem file
                      </a>
                      {!disabled && (
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          className='h-6 w-6 hover:bg-red-50'
                          onClick={() =>
                            form.setValue(
                              `attachments.${index}.fileUrl`,
                              '',
                              { shouldDirty: true, shouldValidate: true },
                            )
                          }
                        >
                          <X className='h-3 w-3 text-red-500' />
                        </Button>
                      )}
                    </div>
                  ) : isUploading ? (
                    <div className='flex items-center justify-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-2 py-2 text-xs text-blue-700'>
                      <Loader2 className='h-3 w-3 animate-spin' />
                      Đang tải lên...
                    </div>
                  ) : disabled ? (
                    <p className='text-xs italic text-muted-foreground'>
                      Chưa có file
                    </p>
                  ) : (
                    <div className='flex gap-2'>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className='h-8 flex-1 text-xs'
                        disabled={anyUploading}
                        onClick={() => handlePickFileFor(index)}
                      >
                        <Upload className='mr-1 h-3 w-3' />
                        Chọn file
                      </Button>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className='h-8 flex-1 border-blue-200 bg-blue-50 text-xs text-blue-700 hover:bg-blue-100'
                        disabled={anyUploading}
                        onClick={() => setCameraIndex(index)}
                      >
                        <Camera className='mr-1 h-3 w-3' />
                        Chụp ảnh
                      </Button>
                    </div>
                  )}
                </div>

                <div className='space-y-1'>
                  <Label className='text-xs'>
                    Ghi chú{' '}
                    <span className='text-muted-foreground'>
                      (giải thích nội dung file)
                    </span>
                  </Label>
                  <Textarea
                    {...form.register(`attachments.${index}.note`)}
                    placeholder='Mô tả ngắn về file này: nội dung, mục đích, lý do đính kèm...'
                    disabled={disabled}
                    rows={2}
                    className='text-sm'
                  />
                </div>
              </div>
            );
          })}
        </div>

        {sectionError && typeof sectionError.message === 'string' && (
          <p className='text-xs text-red-500'>{sectionError.message}</p>
        )}

        <p className='text-xs text-muted-foreground'>
          Hỗ trợ PDF, ảnh (JPG, PNG, HEIC) hoặc ZIP. Tối đa 64MB mỗi file.
        </p>

        <input
          ref={fileInputRef}
          type='file'
          accept='application/pdf,image/*,application/zip,.zip'
          onChange={handleFileInputChange}
          className='hidden'
        />
      </div>

      {cameraIndex !== null && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onCancel={() => setCameraIndex(null)}
          title='Chụp ảnh tài liệu'
          instructions={[
            'Đặt tài liệu trong khung hình',
            'Đảm bảo ảnh rõ nét và đầy đủ thông tin',
            'Nhấn nút chụp để chụp ảnh',
          ]}
          aspectRatio='document'
        />
      )}
    </>
  );
}
