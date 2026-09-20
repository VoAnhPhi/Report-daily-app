'use client';

import React from 'react';
import { Loader2, Gift, Tag } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  useActiveOffers,
  type ActiveOffer,
} from '@/hooks/queries/use-active-offers';
import { useLanguage } from '@/components/sites/home/common/language-context';
import { detectRuntimeTier } from '@/constants/notification-domains';
import { SOLUTIONS_ORIGINS } from '@/constants/solutions-app';

export interface OffersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function offersWithLocation(
  offers: ActiveOffer[] | undefined,
): (ActiveOffer & { warehouseSlug: string })[] {
  return (offers ?? []).filter(
    (offer): offer is ActiveOffer & { warehouseSlug: string } =>
      typeof offer.warehouseSlug === 'string' && offer.warehouseSlug.length > 0,
  );
}

function OfferRow({
  offer,
  onNavigate,
}: {
  offer: ActiveOffer;
  onNavigate: (offer: ActiveOffer) => void;
}) {
  return (
    <button
      type='button'
      onClick={() => onNavigate(offer)}
      className='w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[#FFF1D6]/40 dark:hover:bg-surface-muted transition-colors cursor-pointer'
    >
      <div className='w-9 h-9 rounded-full bg-[#FFF1D6] dark:bg-orange-950/50 flex items-center justify-center shrink-0'>
        <Tag className='w-4 h-4 text-[#FF6B00]' />
      </div>
      <div className='flex-1 min-w-0'>
        <p className='text-sm font-medium text-[#2B2118] dark:text-foreground truncate'>
          {offer.name}
        </p>
        {offer.subtitleText && (
          <p className='text-xs text-muted-foreground truncate mt-0.5'>
            {offer.subtitleText}
          </p>
        )}
      </div>
    </button>
  );
}

export function OffersSheet({ open, onOpenChange }: OffersSheetProps) {
  const { t } = useLanguage();
  const { data, isLoading } = useActiveOffers();

  const visibleOffers = offersWithLocation(data);

  const handleNavigate = (offer: ActiveOffer) => {
    onOpenChange(false);
    const origin = SOLUTIONS_ORIGINS[detectRuntimeTier()];
    window.open(`${origin}/diem-cau/${offer.warehouseSlug}`, '_blank');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side='right'
        className='w-full sm:w-[440px] sm:max-w-[92vw] p-0 flex flex-col gap-0 bg-[#FDFAF5] dark:bg-background'
      >
        <SheetHeader className='px-4 py-3 pr-12 border-b border-[#F0E6D3] dark:border-token bg-white dark:bg-surface'>
          <SheetTitle>{t('community.navigation.items.offers')}</SheetTitle>
          <SheetDescription className='sr-only'>
            {t('community.navigation.items.offers')}
          </SheetDescription>
        </SheetHeader>
        <div className='flex-1 overflow-y-auto min-h-0'>
          {isLoading ? (
            <div
              role='status'
              className='flex items-center justify-center py-16'
            >
              <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
            </div>
          ) : visibleOffers.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-16 px-4 text-center'>
              <Gift className='h-10 w-10 text-muted-foreground/40 mb-3' />
              <p className='text-sm font-medium text-foreground'>
                {t('notifications.sheet.empty_title')}
              </p>
            </div>
          ) : (
            <div className='divide-y'>
              {visibleOffers.map((offer) => (
                <OfferRow
                  key={offer.id}
                  offer={offer}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
