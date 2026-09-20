'use client';

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Play,
  FileIcon,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

// Phím điều hướng ảnh trước/sau (tránh rải magic string trong handler).
const ARROW_LEFT = 'ArrowLeft';
const ARROW_RIGHT = 'ArrowRight';

export type MediaItem = {
  url: string;
  name: string;
  type: 'image' | 'video' | 'file';
};

interface TaskMediaViewerProps {
  isOpen: boolean;
  onClose: () => void;
  mediaItems: MediaItem[];
  initialIndex?: number;
}

export function TaskMediaViewer({
  isOpen,
  onClose,
  mediaItems,
  initialIndex = 0,
}: TaskMediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  /*
   * Kéo chỉ số về `initialIndex` NGAY TRONG render, theo khuôn "điều chỉnh state
   * khi render" của React: giữ cặp giá trị lượt trước trong state, so sánh khi
   * render, khác thì `setState` tại chỗ. React render lại trước khi vẽ.
   *
   * Bản cũ làm việc này trong `useEffect`, và effect chạy SAU khi commit. Component
   * trả `null` khi đóng, nên mỗi lần mở lại, khung hình đầu tiên vẽ bằng chỉ số
   * còn sót của lần xem TRƯỚC rồi mới nhảy sang tệp người dùng vừa bấm.
   */
  const [lastSync, setLastSync] = useState({ isOpen, initialIndex });
  if (lastSync.isOpen !== isOpen || lastSync.initialIndex !== initialIndex) {
    setLastSync({ isOpen, initialIndex });
    if (isOpen) setCurrentIndex(initialIndex);
  }

  // Filter out non-media items if needed, or allow all and just show a "Cannot preview" message
  // Assuming the caller only passes viewable media, or we handle it here.
  const items = mediaItems;

  const currentItem = items[currentIndex];

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  }, [items.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
  }, [items.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === ARROW_LEFT) handlePrevious();
      if (e.key === ARROW_RIGHT) handleNext();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKey);
    }
    return () => document.removeEventListener('keydown', handleKey);
  }, [handlePrevious, handleNext, isOpen]);

  if (!currentItem || !isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='ws-scope !max-w-full !w-screen !h-[100dvh] !p-0 !m-0 bg-black !border-none !rounded-none overflow-hidden flex flex-col gap-0 !z-[9999]'>
        <DialogTitle className='sr-only'>Xem tệp đính kèm</DialogTitle>
        <DialogDescription className='sr-only'>
          Trình xem ảnh và tệp đính kèm của công việc.
        </DialogDescription>

        {/* Header Bar */}
        <div className='flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-50'>
          <div className='flex flex-col'>
            <span className='text-white font-semibold text-sm truncate max-w-[300px] md:max-w-md'>
              {currentItem.name}
            </span>
            <span className='text-white/60 text-xs'>
              {currentIndex + 1} / {items.length}
            </span>
          </div>

          <div className='flex items-center gap-2'>
            <a
              href={currentItem.url}
              target='_blank'
              rel='noopener noreferrer'
              download={currentItem.name}
              className='h-10 w-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors'
              title='Tải xuống'
            >
              <Download className='w-5 h-5' />
            </a>
            <button
              onClick={onClose}
              className='h-10 w-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors'
              aria-label='Close'
            >
              <X className='w-5 h-5' />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className='flex-1 relative flex items-center justify-center w-full h-full overflow-hidden pb-24'>
          {currentItem.type === 'image' && (
            <img
              src={currentItem.url}
              alt={currentItem.name}
              className='max-w-full max-h-full object-contain'
            />
          )}

          {currentItem.type === 'video' && (
            <video
              src={currentItem.url}
              controls
              autoPlay
              className='max-w-full max-h-full object-contain'
            />
          )}

          {currentItem.type === 'file' && (
            <div className='flex flex-col items-center justify-center text-white'>
              <FileIcon className='w-16 h-16 mb-4 text-zinc-500' />
              <span className='text-lg mb-2'>
                Không có bản xem trước cho tệp này.
              </span>
              <a
                href={currentItem.url}
                target='_blank'
                rel='noopener noreferrer'
                className='text-blue-400 hover:underline'
              >
                Tải xuống tệp
              </a>
            </div>
          )}
        </div>

        {/* Navigation Arrows */}
        {items.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrevious();
              }}
              className='absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors z-50'
            >
              <ChevronLeft className='w-8 h-8' />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className='absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors z-50'
            >
              <ChevronRight className='w-8 h-8' />
            </button>

            {/* Thumbnail Strip */}
            <div className='absolute bottom-0 w-full p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center gap-2 overflow-x-auto z-50 scrollbar-hide'>
              {items.map((item, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    'relative w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-all',
                    index === currentIndex
                      ? 'border-white scale-110 shadow-lg z-10'
                      : 'border-transparent opacity-50 hover:opacity-100',
                  )}
                >
                  {item.type === 'image' ? (
                    <img
                      src={item.url}
                      alt={item.name}
                      className='w-full h-full object-cover'
                    />
                  ) : item.type === 'video' ? (
                    <div className='relative w-full h-full bg-zinc-900 flex items-center justify-center'>
                      <video
                        src={item.url}
                        className='w-full h-full object-cover opacity-50'
                      />
                      <Play className='absolute w-6 h-6 text-white fill-white' />
                    </div>
                  ) : (
                    <div className='w-full h-full bg-zinc-800 flex items-center justify-center'>
                      <FileIcon className='w-6 h-6 text-zinc-400' />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
