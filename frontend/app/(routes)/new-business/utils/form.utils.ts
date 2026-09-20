import type { BusinessFormValues } from '../schemas/business-form.schema';

export type BlockerSection =
  | 'mst'
  | 'company'
  | 'contact'
  | 'description'
  | 'productInfo'
  | 'products'
  | 'legalDocs'
  | 'attachments';

export interface Blocker {
  section: BlockerSection;
  label: string;
  /** Soft = waiting on async (e.g. MST lookup). UX: amber, no list-bullet emphasis. */
  soft?: boolean;
}

export function buildBlockers(
  values: BusinessFormValues,
  flags: {
    showCompanyFields: boolean;
    isMstTaken: boolean;
    isLookupFetching: boolean;
    isMstFetching: boolean;
  },
): Blocker[] {
  const blockers: Blocker[] = [];

  const tax = (values.taxCode ?? '').trim();
  if (tax.length === 0) {
    blockers.push({ section: 'mst', label: 'Nhập mã số thuế (MST)' });
  } else if (!/^[A-Za-z0-9]{8,13}$/.test(tax)) {
    blockers.push({
      section: 'mst',
      label: 'MST gồm 8–13 ký tự (chữ hoặc số)',
    });
  } else if (flags.isMstTaken) {
    blockers.push({ section: 'mst', label: 'MST đã tồn tại trong hệ thống' });
  } else if (flags.isMstFetching) {
    blockers.push({
      section: 'mst',
      label: 'Đang kiểm tra mã số thuế...',
      soft: true,
    });
  } else if (!flags.showCompanyFields) {
    blockers.push({
      section: 'mst',
      label: flags.isLookupFetching
        ? 'Đang tra cứu thông tin đối tác...'
        : 'Chờ tra cứu thông tin đối tác',
      soft: true,
    });
  }

  if (flags.showCompanyFields) {
    if (!(values.companyName ?? '').trim()) {
      blockers.push({ section: 'company', label: 'Tên công ty' });
    }
    if (!(values.address ?? '').trim()) {
      blockers.push({ section: 'company', label: 'Địa chỉ công ty' });
    }
  }

  if (!(values.contactName ?? '').trim()) {
    blockers.push({ section: 'contact', label: 'Tên người liên lạc' });
  }
  const phone = (values.contactPhone ?? '').trim();
  if (!phone) {
    blockers.push({ section: 'contact', label: 'Số điện thoại liên lạc' });
  } else if (!/^(\+84|0)\d{9,10}$/.test(phone)) {
    blockers.push({
      section: 'contact',
      label: 'Số điện thoại liên lạc (10 chữ số, bắt đầu bằng 0 hoặc +84)',
    });
  }

  (values.products ?? []).forEach((p, idx) => {
    if (!(p.name ?? '').trim()) {
      blockers.push({
        section: 'products',
        label: `Sản phẩm #${idx + 1}: thiếu tên sản phẩm`,
      });
    }
    if (typeof p.price === 'number' && p.price < 0) {
      blockers.push({
        section: 'products',
        label: `Sản phẩm #${idx + 1}: giá phải >= 0`,
      });
    }
  });

  (values.attachments ?? []).forEach((row, idx) => {
    const hasFile = (row.fileUrl ?? '').trim().length > 0;
    const hasLabel = (row.label ?? '').trim().length > 0;
    if (hasFile && !hasLabel) {
      blockers.push({
        section: 'attachments',
        label: `Tài liệu #${idx + 1}: thiếu tên/nhãn`,
      });
    }
  });

  return blockers;
}

export function scrollToSection(section: BlockerSection) {
  if (typeof window === 'undefined') return;
  const el = document.getElementById(`bf-section-${section}`);
  if (!el) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[business-form] missing section anchor: bf-section-${section}`,
      );
    }
    return;
  }

  // scrollIntoView honors `scroll-margin-top` (set via Tailwind `scroll-mt-24`),
  // and works whether the page scrolls on `window` or on a parent container.
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Belt-and-suspenders fallback: also adjust window.scrollY in case the
  // ancestor scroll container differs from `window` (some mobile browsers).
  const rect = el.getBoundingClientRect();
  const headerOffset = 88;
  const targetTop = rect.top + window.scrollY - headerOffset;
  window.scrollTo({ top: targetTop, behavior: 'smooth' });

  // Brief highlight so the user sees where they landed (works even when
  // the section is already in view and no scrolling occurs).
  const highlightClasses = [
    'ring-2',
    'ring-amber-400',
    'ring-offset-2',
    'rounded-md',
    'bg-amber-50/60',
    'transition-colors',
    'duration-300',
  ];
  highlightClasses.forEach((c) => el.classList.add(c));
  window.setTimeout(() => {
    highlightClasses.forEach((c) => el.classList.remove(c));
  }, 1800);

  // Autofocus the first input so mobile keyboard pops up immediately.
  window.setTimeout(() => {
    const focusable = el.querySelector(
      'input:not([disabled]):not([type="hidden"]), textarea:not([disabled])',
    ) as HTMLElement | null;
    focusable?.focus({ preventScroll: true });
  }, 480);
}
