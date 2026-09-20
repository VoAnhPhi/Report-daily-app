'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export interface PreviewItem {
  file: File;
  note: string;
}

interface LegalDocPreviewModalProps {
  open: boolean;
  files: File[];
  onConfirm: (items: PreviewItem[]) => void;
  onCancel: () => void;
}

function FilePreview({ file, objectUrl }: { file: File; objectUrl: string }) {
  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf';

  if (isImage) {
    return (
      <div className="w-full h-32 rounded-md overflow-hidden border border-zinc-200 bg-zinc-50 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={objectUrl}
          alt={file.name}
          className="max-h-full max-w-full object-contain"
        />
      </div>
    );
  }

  const Icon = isPdf ? FileText : Archive;
  const label = isPdf ? 'PDF' : 'ZIP';
  const colorClass = isPdf ? 'text-red-500' : 'text-amber-500';

  return (
    <div className="w-full h-32 rounded-md border border-zinc-200 bg-zinc-50 flex flex-col items-center justify-center gap-1.5">
      <Icon className={`h-10 w-10 ${colorClass}`} />
      <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
        {label}
      </span>
      <span className="text-[10px] text-zinc-400 truncate max-w-[90%] px-1">
        {file.name}
      </span>
    </div>
  );
}

export function LegalDocPreviewModal({
  open,
  files,
  onConfirm,
  onCancel,
}: LegalDocPreviewModalProps) {
  const [items, setItems] = useState<PreviewItem[]>([]);
  const objectUrlsRef = useRef<string[]>([]);

  // Initialise state and create object URLs when files change.
  useEffect(() => {
    // Revoke previous URLs first.
    objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    const urls = files.map((f) => URL.createObjectURL(f));
    objectUrlsRef.current = urls;
    setItems(files.map((file) => ({ file, note: '' })));
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
      objectUrlsRef.current = [];
    };
  }, [files]);

  // Also revoke on unmount if modal closes without re-triggering the effect.
  useEffect(() => {
    if (!open) {
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      objectUrlsRef.current = [];
    }
  }, [open]);

  const updateNote = (idx: number, note: string) =>
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, note } : item)),
    );

  const handleConfirm = () => onConfirm(items);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent
        className="max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>Xem trước & ghi chú file</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 px-1 py-2">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="grid grid-cols-12 gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
            >
              {/* Left: preview */}
              <div className="col-span-12 sm:col-span-8">
                <FilePreview
                  file={item.file}
                  objectUrl={objectUrlsRef.current[idx] ?? ''}
                />
                <p className="mt-1.5 text-[11px] text-zinc-500 truncate">
                  {item.file.name}
                </p>
              </div>

              {/* Right: note */}
              <div className="col-span-12 sm:col-span-4 flex flex-col gap-1">
                <Label className="text-xs font-medium text-zinc-700">
                  Ghi chú{' '}
                  <span className="text-muted-foreground font-normal">
                    (tuỳ chọn)
                  </span>
                </Label>
                <Textarea
                  value={item.note}
                  onChange={(e) => updateNote(idx, e.target.value)}
                  placeholder="Đây là file gì?"
                  rows={4}
                  maxLength={500}
                  className="text-xs resize-none flex-1"
                />
                <p className="text-[10px] text-muted-foreground text-right">
                  {item.note.length}/500
                </p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="pt-2 gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onCancel}>
            Hủy
          </Button>
          <Button type="button" onClick={handleConfirm}>
            Xác nhận tải lên
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
