'use client';

import { FormProvider } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Info,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { BusinessFormValues } from '../schemas/business-form.schema';
import { MstInput } from './mst-input';
import { LegalDocUploads } from './legal-doc-uploads';
import { ProductRows } from './product-rows';
import { AttachmentsSection } from './attachments-section';
import { BUSINESS_FORM_HINTS } from '../constants/messages';
import { useBusinessFormState } from '@/hooks/use-business-form-state';
import type { Blocker } from '../utils/form.utils';

interface BusinessFormProps {
  defaultValues?: Partial<BusinessFormValues>;
  currentUserId?: string;
  onSubmit: (values: BusinessFormValues) => Promise<void>;
  isSubmitting: boolean;
  submitLabel?: string;
  disabled?: boolean;
  lockMst?: boolean;
}

export function BusinessForm({
  defaultValues,
  currentUserId,
  onSubmit,
  isSubmitting,
  submitLabel,
  disabled = false,
  lockMst = false,
}: BusinessFormProps) {
  const {
    methods,
    nameSource,
    setNameSource,
    isIndividual,
    showCompanyFields,
    blockers,
    isSubmitDisabled,
    buttonStateLabel,
    handleSubmit,
    isMstTaken,
    mstFetching,
    isLookupFetching,
    lookup,
    lookupHit,
    lookupFallback,
  } = useBusinessFormState({
    defaultValues,
    lockMst,
    disabled,
    isSubmitting,
    submitLabel,
    onSubmit,
  });

  const showStatusPanel = !disabled && !isSubmitting;

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit}
        className='space-y-6 pb-4'
        data-testid='business-form'
      >
        <div className='space-y-4'>
          <h2 className='text-base font-semibold'>Thông tin cơ bản</h2>

          <section
            id='bf-section-mst'
            className='scroll-mt-24 space-y-3 transition-shadow'
          >
            <FormField
              control={methods.control}
              name='isIndividual'
              render={({ field }) => (
                <FormItem className='flex flex-row items-start gap-2 space-y-0'>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                      disabled={disabled || lockMst}
                      className='mt-0.5'
                    />
                  </FormControl>
                  <FormLabel className='cursor-pointer text-sm font-normal leading-snug'>
                    Đăng ký bằng mã số thuế cá nhân
                  </FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={methods.control}
              name='taxCode'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Mã số thuế (MST) <span className='text-red-500'>*</span>
                  </FormLabel>
                  <FormControl>
                    <MstInput
                      value={field.value}
                      onChange={field.onChange}
                      currentUserId={currentUserId}
                      disabled={disabled || lockMst}
                      isIndividual={isIndividual}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isIndividual && !lockMst && !isMstTaken && !showCompanyFields && (
              <div className='flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800'>
                {isLookupFetching ? (
                  <Loader2 className='mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin' />
                ) : (
                  <Info className='mt-0.5 h-3.5 w-3.5 shrink-0' />
                )}
                <span>
                  {isLookupFetching
                    ? 'Đang tra cứu thông tin MST...'
                    : BUSINESS_FORM_HINTS.mstNeeded}
                </span>
              </div>
            )}

            {!isIndividual &&
              !lockMst &&
              !isMstTaken &&
              lookupHit &&
              lookup.found && (
                <div className='rounded-md border border-green-200 bg-green-50 p-3 text-xs text-green-800 space-y-2'>
                  <p className='flex items-center gap-1 font-medium'>
                    <CheckCircle className='h-3.5 w-3.5' />
                    {BUSINESS_FORM_HINTS.lookupSuccess}
                  </p>
                  {lookup.data.internationalName && (
                    <div className='space-y-1'>
                      <p className='text-[11px] text-green-700'>
                        Chọn tên hiển thị:
                      </p>
                      <div className='flex flex-wrap gap-2'>
                        <Button
                          type='button'
                          size='sm'
                          variant={nameSource === 'vn' ? 'default' : 'outline'}
                          className='h-7 text-xs'
                          onClick={() => setNameSource('vn')}
                          disabled={disabled}
                        >
                          Tên Việt Nam
                        </Button>
                        <Button
                          type='button'
                          size='sm'
                          variant={nameSource === 'en' ? 'default' : 'outline'}
                          className='h-7 text-xs'
                          onClick={() => setNameSource('en')}
                          disabled={disabled}
                        >
                          Tên quốc tế
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            {!isIndividual && !lockMst && !isMstTaken && lookupFallback && (
              <div className='flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800'>
                <AlertTriangle className='mt-0.5 h-3.5 w-3.5 shrink-0' />
                <span>{BUSINESS_FORM_HINTS.lookupFallback}</span>
              </div>
            )}
          </section>

          {showCompanyFields && (
            <section
              id='bf-section-company'
              className='scroll-mt-24 space-y-4 transition-shadow'
            >
              <FormField
                control={methods.control}
                name='companyName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {isIndividual ? 'Họ và tên' : 'Tên công ty'}{' '}
                      <span className='text-red-500'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={
                          isIndividual ? 'Nguyễn Văn A' : 'Công ty TNHH ABC'
                        }
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={methods.control}
                name='address'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Địa chỉ <span className='text-red-500'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder='123 Đường ABC, Quận 1, TP.HCM'
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>
          )}

          <section
            id='bf-section-contact'
            className='scroll-mt-24 space-y-4 transition-shadow'
          >
            <FormField
              control={methods.control}
              name='contactName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Tên người liên lạc <span className='text-red-500'>*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder='Nguyễn Văn A'
                      disabled={disabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={methods.control}
              name='contactPhone'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Số điện thoại liên lạc{' '}
                    <span className='text-red-500'>*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      inputMode='tel'
                      placeholder='0901234567'
                      disabled={disabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>
        </div>

        <Separator />
        <section
          id='bf-section-description'
          className='scroll-mt-24 transition-shadow'
        >
          <FormField
            control={methods.control}
            name='description'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mô tả nhu cầu hợp tác</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder='Hãy mô tả chi tiết hình thức hợp tác bạn mong muốn để chúng tôi có thể phản hồi nhanh nhất...'
                    rows={4}
                    disabled={disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <Separator />
        <section
          id='bf-section-productInfo'
          className='scroll-mt-24 transition-shadow'
        >
          <FormField
            control={methods.control}
            name='productInfo'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mô tả về doanh nghiệp / sản phẩm</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder='Giới thiệu ngắn về doanh nghiệp, dòng sản phẩm chính, lợi thế cạnh tranh...'
                    rows={4}
                    disabled={disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <Separator />
        <section
          id='bf-section-legalDocs'
          className='scroll-mt-24 transition-shadow'
        >
          <LegalDocUploads disabled={disabled} />
        </section>

        <Separator />
        <section
          id='bf-section-products'
          className='scroll-mt-24 transition-shadow'
        >
          <ProductRows disabled={disabled} />
        </section>

        <Separator />
        <section
          id='bf-section-attachments'
          className='scroll-mt-24 transition-shadow'
        >
          <AttachmentsSection
            disabled={disabled}
            title='Hồ sơ khác'
            helper='Đính kèm các giấy tờ chưa có trong danh mục bên trên (vd: ISO, HACCP, hợp đồng phân phối, ...) và ghi chú lý do.'
          />
        </section>

        {!disabled && (
          <SubmitStatusFooter
            blockers={blockers}
            isSubmitDisabled={isSubmitDisabled}
            isSubmitting={isSubmitting}
            isBusy={mstFetching || isLookupFetching}
            buttonStateLabel={buttonStateLabel}
            showSuccessHint={
              showStatusPanel &&
              blockers.length === 0 &&
              !isSubmitting &&
              showCompanyFields
            }
          />
        )}
      </form>
    </FormProvider>
  );
}

interface SubmitStatusFooterProps {
  blockers: Blocker[];
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  isBusy: boolean;
  buttonStateLabel: string;
  showSuccessHint: boolean;
}

function SubmitStatusFooter({
  blockers,
  isSubmitDisabled,
  isSubmitting,
  isBusy,
  buttonStateLabel,
  showSuccessHint,
}: SubmitStatusFooterProps) {
  // Không liệt kê các mục còn thiếu ở đây nữa. Bấm nút gửi mới cuộn tới mục
  // thiếu đầu tiên và bật thông báo ngay dưới ô đó — lỗi nằm cạnh chỗ sửa,
  // không phải ở một bảng riêng cuối form.
  const softBlockers = blockers.filter((b) => b.soft);
  const showSoftList = softBlockers.length > 0 && blockers.every((b) => b.soft);

  return (
    <div
      className={cn(
        'sticky bottom-0 z-20 -mx-4 sm:-mx-6 mt-2 px-4 sm:px-6 pt-3 sm:pt-4 pb-4',
        'bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/80',
        'border-t border-zinc-200 sm:rounded-b-lg',
      )}
    >
      {showSoftList && (
        <div
          className='mb-3 flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-800'
          role='status'
          aria-live='polite'
        >
          <Loader2 className='h-3.5 w-3.5 shrink-0 animate-spin' />
          <span>{softBlockers[0].label}</span>
        </div>
      )}

      {showSuccessHint && (
        <div
          className='mb-3 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-2.5 text-xs text-green-800'
          role='status'
        >
          <CheckCircle2 className='h-4 w-4 shrink-0' />
          <span className='font-medium'>
            Đã đủ thông tin. Bấm nút bên dưới để gửi đăng ký.
          </span>
        </div>
      )}

      <div className='flex justify-stretch sm:justify-end'>
        <Button
          type='submit'
          disabled={isSubmitDisabled}
          data-testid='submit-button'
          size='lg'
          className='w-full font-semibold sm:w-auto sm:min-w-50'
        >
          {(isSubmitting || isBusy) && (
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          )}
          {buttonStateLabel}
        </Button>
      </div>
    </div>
  );
}
