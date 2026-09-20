'use client';

import { AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CheckMstTakenResponse, STATUS_LABEL_VI } from '@/types/business-form.type';
import { format } from 'date-fns';

interface MstConflictPanelProps {
  existing: CheckMstTakenResponse['existing'];
  currentUserId?: string;
  onDeleteOwn?: () => void;
  isDeleting?: boolean;
}

export function MstConflictPanel({
  existing,
  currentUserId,
  onDeleteOwn,
  isDeleting,
}: MstConflictPanelProps) {
  const isOwn =
    currentUserId != null &&
    existing.user.id === currentUserId &&
    existing.status === 'pending';

  return (
    <div
      data-testid="mst-conflict-panel"
      className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
        <div className="flex-1 space-y-1">
          <p className="font-medium">MST đã được đăng ký</p>
          <p>
            Đã được <span className="font-semibold">{existing.user.fullName}</span> đăng ký
            cho công ty &ldquo;<span className="font-semibold">{existing.companyName}</span>&rdquo;
            — trạng thái: <span className="font-semibold">{STATUS_LABEL_VI[existing.status]}</span>{' '}
            ({format(new Date(existing.createdAt), 'dd/MM/yyyy')})
          </p>
          {isOwn && onDeleteOwn && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="mt-2"
              disabled={isDeleting}
              onClick={onDeleteOwn}
              data-testid="delete-confirm"
            >
              <Trash2 className="mr-1 h-3 w-3" />
              {isDeleting ? 'Đang xóa...' : 'Xóa form này'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
