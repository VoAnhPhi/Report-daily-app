'use client';

import { useRef, useState } from 'react';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';

const vndFormatter = new Intl.NumberFormat('vi-VN');

function formatVnd(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '';
  return vndFormatter.format(value);
}

function parseVnd(input: string): number {
  const digits = input.replace(/\D/g, '');
  return digits === '' ? 0 : Number(digits);
}
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { uploadFiles } from '@/lib/uploadthing';
import { convertHeicToJpeg } from '@/lib/heic-converter';
import { CameraCapture } from '@/components/kyc/camera-capture';
import { Camera, Loader2, Plus, Trash2, Upload, X } from 'lucide-react';
import type { BusinessFormValues } from '../schemas/business-form.schema';
import {
  BUSINESS_FORM_ERROR,
  BUSINESS_FORM_SUCCESS,
} from '../constants/messages';

interface ProductRowsProps {
  disabled?: boolean;
}

export function ProductRows({ disabled }: ProductRowsProps) {
  const form = useFormContext<BusinessFormValues>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'products',
  });

  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [cameraIndex, setCameraIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetIndexRef = useRef<number | null>(null);

  const persist = async (index: number, file: File, successMsg: string) => {
    setUploadingIndex(index);
    try {
      let toUpload = file;
      try {
        toUpload = await convertHeicToJpeg(file);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : BUSINESS_FORM_ERROR.heicConversion;
        toast.error(msg);
        return;
      }
      const res = await uploadFiles('imageUploader', { files: [toUpload] });
      const url = res?.[0]?.ufsUrl ?? res?.[0]?.url;
      if (!url) throw new Error('Upload failed: no URL returned');
      form.setValue(`products.${index}.imageUrl`, url, {
        shouldDirty: true,
        shouldValidate: true,
      });
      toast.success(successMsg);
    } catch (err) {
      console.error('Product image upload error:', err);
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

    if (!file.type.startsWith('image/')) {
      toast.error(BUSINESS_FORM_ERROR.invalidImageType);
      return;
    }

    await persist(index, file, BUSINESS_FORM_SUCCESS.uploadImage);
  };

  const handleCameraCapture = async (file: File) => {
    const index = cameraIndex;
    if (index === null) return;
    await persist(index, file, BUSINESS_FORM_SUCCESS.captureImage);
    setCameraIndex(null);
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex-column md:flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-zinc-700">
            Danh sách sản phẩm{' '}
            <span className="text-muted-foreground text-xs">
              (không bắt buộc)
            </span>
          </p>
          {!disabled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ name: '', price: 0, imageUrl: '' })}
            >
              <Plus className="mr-1 h-3 w-3" />
              Thêm sản phẩm
            </Button>
          )}
        </div>

        {fields.length === 0 && (
          <p className="text-xs text-muted-foreground">Chưa có sản phẩm nào.</p>
        )}

        {fields.map((field, index) => {
          const imageUrl = form.watch(`products.${index}.imageUrl`);
          const isUploading = uploadingIndex === index;
          const anyUploading = uploadingIndex !== null;

          return (
            <div
              key={field.id}
              className="rounded-lg border bg-zinc-50 p-3 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-600">
                  Sản phẩm #{index + 1}
                </span>
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 hover:text-red-700"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">
                    Tên sản phẩm <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    {...form.register(`products.${index}.name`)}
                    placeholder="Tên sản phẩm"
                    disabled={disabled}
                    className="h-8 text-sm"
                  />
                  {form.formState.errors.products?.[index]?.name && (
                    <p className="text-xs text-red-500">
                      {form.formState.errors.products[index]?.name?.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">
                    Giá (VNĐ) <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    control={form.control}
                    name={`products.${index}.price`}
                    render={({ field }) => (
                      <div className="relative">
                        <Input
                          inputMode="numeric"
                          value={formatVnd(field.value)}
                          onChange={(e) => field.onChange(parseVnd(e.target.value))}
                          onBlur={field.onBlur}
                          placeholder="0"
                          disabled={disabled}
                          className="h-8 pr-9 text-sm"
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          ₫
                        </span>
                      </div>
                    )}
                  />
                  {form.formState.errors.products?.[index]?.price && (
                    <p className="text-xs text-red-500">
                      {form.formState.errors.products[index]?.price?.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">
                  Ảnh sản phẩm{' '}
                  <span className="text-muted-foreground">
                    (không bắt buộc)
                  </span>
                </Label>

                {imageUrl ? (
                  <div className="flex items-center gap-2 rounded-md border border-green-200 bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt="product preview"
                      className="h-14 w-14 rounded object-cover border"
                    />
                    <a
                      href={imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-xs text-blue-600 underline truncate"
                    >
                      Xem ảnh
                    </a>
                    {!disabled && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-red-50"
                        onClick={() =>
                          form.setValue(`products.${index}.imageUrl`, '', {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                      >
                        <X className="h-3 w-3 text-red-500" />
                      </Button>
                    )}
                  </div>
                ) : isUploading ? (
                  <div className="flex items-center justify-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-2 py-2 text-xs text-blue-700">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Đang tải lên...
                  </div>
                ) : disabled ? (
                  <p className="text-xs text-muted-foreground italic">
                    Chưa có ảnh
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      disabled={anyUploading}
                      onClick={() => handlePickFileFor(index)}
                    >
                      <Upload className="mr-1 h-3 w-3" />
                      Chọn ảnh
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                      disabled={anyUploading}
                      onClick={() => setCameraIndex(index)}
                    >
                      <Camera className="mr-1 h-3 w-3" />
                      Chụp ảnh
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {cameraIndex !== null && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onCancel={() => setCameraIndex(null)}
          title="Chụp ảnh sản phẩm"
          instructions={[
            'Đặt sản phẩm trong khung hình',
            'Đảm bảo ảnh rõ nét',
            'Nhấn nút chụp để chụp ảnh',
          ]}
          aspectRatio="square"
        />
      )}
    </>
  );
}
