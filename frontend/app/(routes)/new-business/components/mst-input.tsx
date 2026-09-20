'use client';

import { CheckCircle, Info, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useMstCheck } from '@/hooks/queries/business-forms/use-mst-check';
import { useSoftDeleteBusinessForm } from '@/hooks/queries/business-forms/business-forms-queries';
import { MstConflictPanel } from './mst-conflict-panel';
import { toast } from 'sonner';
import type { ChangeEvent } from 'react';
import {
  BUSINESS_FORM_ERROR,
  BUSINESS_FORM_HINTS,
  BUSINESS_FORM_SUCCESS,
} from '../constants/messages';

interface MstInputProps {
  value: string;
  onChange: (value: string) => void;
  currentUserId?: string;
  disabled?: boolean;
  /**
   * MST cá nhân: bỏ qua hoàn toàn check trùng + tra cứu, không hiển thị hint.
   * Feed '' vào useMstCheck để `enabled:false` (định dạng rỗng) → không gọi network.
   */
  isIndividual?: boolean;
}

export function MstInput({
  value,
  onChange,
  currentUserId,
  disabled,
  isIndividual = false,
}: MstInputProps) {
  // When the field is locked (edit / read-only) or marked MST cá nhân, skip the
  // live duplicate-check — for locked the user cannot change the MST so the
  // conflict panel is noise; for cá nhân the duplicate check is intentionally
  // bypassed. Feeding '' disables the query (enabled gating on MST format).
  const { data: mstCheck, isFetching } = useMstCheck(
    disabled || isIndividual ? '' : value,
  );
  const deleteMutation = useSoftDeleteBusinessForm();

  const normalized = value.trim().replace(/\D/g, '');
  const isValidLength = normalized.length === 10 || normalized.length === 13;
  const showLiveHints = !disabled && !isIndividual;

  const handleDelete = async () => {
    if (!mstCheck?.taken) return;
    const formId = mstCheck.existing.id;
    if (!formId) {
      toast.error(BUSINESS_FORM_ERROR.formIdMissing);
      return;
    }
    try {
      await deleteMutation.mutateAsync({ id: formId, taxCode: normalized });
      toast.success(BUSINESS_FORM_SUCCESS.deleteAndMstAvailable);
    } catch {
      toast.error(BUSINESS_FORM_ERROR.delete);
    }
  };

  return (
    <div className="space-y-2" data-testid="mst-input">
      <div className="relative">
        <Input
          value={value}
          // Keep only letters/digits as the user types or pastes. Strips whitespace
          // and invisible Unicode marks (e.g. U+202D/U+202C from copy-paste) that
          // survive .trim() and would fail the [A-Za-z0-9] validation even though the
          // visible characters look valid — while the lenient VietQR lookup still resolves.
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange(e.target.value.replace(/[^A-Za-z0-9]/g, ''))
          }
          placeholder="Nhập mã số thuế (8–13 ký tự, chữ hoặc số)"
          disabled={disabled}
          className="pr-8"
        />
        {showLiveHints && isFetching && isValidLength && (
          <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {showLiveHints &&
          !isFetching &&
          isValidLength &&
          mstCheck &&
          !mstCheck.taken && (
            <CheckCircle className="absolute right-2 top-2.5 h-4 w-4 text-green-500" />
          )}
      </div>

      {disabled && (
        <p className="flex items-start gap-1 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{BUSINESS_FORM_HINTS.mstLocked}</span>
        </p>
      )}

      {showLiveHints && isValidLength && !isFetching && mstCheck?.taken && (
        <MstConflictPanel
          existing={mstCheck.existing}
          currentUserId={currentUserId}
          onDeleteOwn={handleDelete}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
