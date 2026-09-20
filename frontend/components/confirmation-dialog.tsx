'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  isLoading?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'default',
  isLoading = false,
}: ConfirmationDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-106.25'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <AlertCircle
              className={`h-5 w-5 ${
                variant === 'destructive' ? 'text-destructive' : ''
              }`}
            />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className='flex justify-end gap-3 pt-4'>
          <Button
            type='button'
            variant='outline'
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            type='button'
            variant={variant}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Đang xử lý...' : confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
