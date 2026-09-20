'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  businessFormSchema,
  BusinessFormValues,
} from '@/app/(routes)/new-business/schemas/business-form.schema';
import { useMstDerivedState } from '@/hooks/queries/business-forms/use-mst-check';
import { BUSINESS_FORM_LABELS } from '@/app/(routes)/new-business/constants/messages';
import {
  buildBlockers,
  scrollToSection,
} from '@/app/(routes)/new-business/utils/form.utils';
import type { Blocker } from '@/app/(routes)/new-business/utils/form.utils';
import type { MstLookupResult } from '@/types/business-form.type';

type NameSource = 'vn' | 'en';

interface UseBusinessFormStateProps {
  defaultValues?: Partial<BusinessFormValues>;
  lockMst?: boolean;
  disabled?: boolean;
  isSubmitting: boolean;
  submitLabel?: string;
  onSubmit: (values: BusinessFormValues) => Promise<void>;
}

interface UseBusinessFormStateReturn {
  methods: ReturnType<typeof useForm<BusinessFormValues>>;
  nameSource: NameSource;
  setNameSource: (source: NameSource) => void;
  isIndividual: boolean;
  showCompanyFields: boolean;
  blockers: Blocker[];
  isSubmitDisabled: boolean;
  buttonStateLabel: string;
  hasAttemptedSubmit: boolean;
  handleSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  isMstTaken: boolean;
  mstFetching: boolean;
  isLookupFetching: boolean;
  lookup: MstLookupResult | undefined;
  lookupHit: boolean;
  lookupFallback: boolean;
}

export function useBusinessFormState({
  defaultValues,
  lockMst = false,
  disabled = false,
  isSubmitting,
  submitLabel = BUSINESS_FORM_LABELS.submit,
  onSubmit,
}: UseBusinessFormStateProps): UseBusinessFormStateReturn {
  const methods = useForm<BusinessFormValues>({
    resolver: zodResolver(businessFormSchema),
    // Validate live so the user sees the error message as soon as
    // contactPhone (or any field) fails its rule, not just after blur.
    mode: 'onChange',
    defaultValues: {
      isIndividual: false,
      companyName: '',
      taxCode: '',
      address: '',
      contactName: '',
      contactPhone: '',
      description: '',
      productInfo: '',
      gpkdFileUrl: [],
      congBoSpFileUrl: [],
      kiemNghiemFileUrl: [],
      nhanSpFileUrl: [],
      maVachFileUrl: [],
      tccsFileUrl: [],
      coFileUrl: [],
      dangKyNhFileUrl: [],
      gmpFileUrl: [],
      otherDocFileUrl: [],
      products: [],
      attachments: [],
      ...defaultValues,
    },
  });

  const watchedValues = methods.watch();

  const isIndividual = watchedValues.isIndividual ?? false;
  const taxCodeValue = watchedValues.taxCode;
  const {
    isMstTaken,
    mstFetching,
    lookup,
    isLookupFetching,
    lookupHit,
    lookupFallback,
    lookupResolvedForCurrentMst,
  } = useMstDerivedState(
    // MST cá nhân: bỏ qua hoàn toàn tra cứu VietQR + check trùng — feed '' để cả
    // hai query đều bị `enabled:false` (định dạng MST rỗng), không gọi network.
    isIndividual ? '' : (taxCodeValue ?? ''),
    lockMst,
  );

  const [nameSource, setNameSource] = useState<NameSource>('vn');
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  useEffect(() => {
    if (!lookup || !lookup.found || lockMst) return;
    const useEnglish = nameSource === 'en' && !!lookup.data.internationalName;
    const chosenName = useEnglish
      ? lookup.data.internationalName
      : lookup.data.name;
    methods.setValue('companyName', chosenName, { shouldValidate: true });
    methods.setValue('address', lookup.data.address, { shouldValidate: true });
  }, [lookup, nameSource, lockMst, methods]);

  const hasInitialCompanyInfo = !!(
    defaultValues?.companyName && defaultValues?.address
  );

  // MST hợp lệ (8–13 ký tự) nhưng KHÔNG tra cứu được qua VietQR — tức không
  // phải mã 10/13 chữ số thuần (có chữ cái, hoặc độ dài 8/9/11/12). Khi đó
  // không có lookup để chờ → hiện luôn các trường công ty cho người dùng tự
  // nhập (giữ nguyên luồng tra cứu cho mã doanh nghiệp 10/13 chữ số).
  const trimmedTax = (taxCodeValue ?? '').trim();
  const taxDigits = trimmedTax.replace(/\D/g, '');
  const taxIsValidFormat = /^[A-Za-z0-9]{8,13}$/.test(trimmedTax);
  const taxIsVietqrLookupable =
    !isIndividual && (taxDigits.length === 10 || taxDigits.length === 13);
  const manualCompanyEntry = taxIsValidFormat && !taxIsVietqrLookupable;

  const showCompanyFields =
    isIndividual ||
    lockMst ||
    hasInitialCompanyInfo ||
    manualCompanyEntry ||
    (!isMstTaken && lookupResolvedForCurrentMst);

  const blockers = useMemo(
    () =>
      buildBlockers(watchedValues, {
        showCompanyFields,
        isMstTaken,
        isLookupFetching,
        isMstFetching: mstFetching,
      }),
    [
      watchedValues,
      showCompanyFields,
      isMstTaken,
      isLookupFetching,
      mstFetching,
    ],
  );

  // Nút gửi KHÔNG bị khoá vì thiếu trường. Bấm nút là hành vi cố ý, và đó là
  // lúc tốt nhất để chỉ chỗ thiếu — thay cho một bảng cảnh báo thường trực
  // đứng chắn ở chân form. Chỉ khoá ở những trạng thái mà bấm cũng vô ích:
  // đang gửi, đang tra cứu MST, hoặc MST đã có người khác dùng.
  const isSubmitDisabled =
    disabled || isSubmitting || isMstTaken || mstFetching || isLookupFetching;

  const runSubmit = methods.handleSubmit(
    async (values) => {
      setHasAttemptedSubmit(false);
      await onSubmit(values);
    },
    () => {
      setHasAttemptedSubmit(true);
      if (blockers.length > 0) scrollToSection(blockers[0].section);
    },
  );

  const handleSubmit = async (e?: React.BaseSyntheticEvent) => {
    // `blockers` rộng hơn schema zod (đợi tra cứu MST, tên sản phẩm, nhãn tài
    // liệu…), nên phải chặn ở đây chứ không thể trông vào nhánh lỗi của
    // `methods.handleSubmit` — có trường hợp zod qua mà form vẫn chưa gửi được.
    if (blockers.length > 0) {
      e?.preventDefault();
      setHasAttemptedSubmit(true);
      // Bật thông báo dưới từng ô để lỗi hiện ngay tại chỗ nó thuộc về.
      void methods.trigger();
      scrollToSection(blockers[0].section);
      return;
    }
    await runSubmit(e);
  };

  const buttonStateLabel = (() => {
    if (isSubmitting) return 'Đang gửi...';
    if (mstFetching) return 'Đang kiểm tra MST...';
    if (isLookupFetching) return 'Đang tra cứu MST...';
    if (isMstTaken) return 'MST đã tồn tại — không thể gửi';
    return submitLabel;
  })();

  return {
    methods,
    nameSource,
    setNameSource,
    isIndividual,
    showCompanyFields,
    blockers,
    isSubmitDisabled,
    buttonStateLabel,
    hasAttemptedSubmit,
    handleSubmit,
    isMstTaken,
    mstFetching,
    isLookupFetching,
    lookup,
    lookupHit,
    lookupFallback,
  };
}
