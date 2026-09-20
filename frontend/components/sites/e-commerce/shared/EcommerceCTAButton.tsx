'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import ShoppingIconCustom from '@/components/ui/shopping-cart';
import { useLanguage } from '@/components/sites/home/common/language-context';

interface EcommerceCTAButtonProps {
  href?: string;
  className?: string;
  icon?: React.ReactNode;
  openInNewTab?: boolean;
  label?: string;
}
/**
 * Enhanced CTA Button for e-commerce navigation.
 * - Shows "Mua hàng" text with shopping bag icon
 * - Purple→pink gradient background
 * - Larger, more prominent button
 */
export default function EcommerceCTAButton({
  href = 'https://e-commerce.acta.vn',
  className,
  icon,
  openInNewTab = true,
  label,
}: EcommerceCTAButtonProps) {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const buttonLabel = label || t('buttons.shop');

  const handleClick = () => {
    setIsLoading(true);
    // Simulate loading for UX, reset after navigation starts
    setTimeout(() => setIsLoading(false), 1500);
  };

  const Body = (
    <button
      type='button'
      onClick={handleClick}
      aria-label={buttonLabel}
      className={[
        'group inline-flex items-center justify-center gap-2 transition-colors duration-200',
        'h-11 w-11 p-0 rounded-xl shrink-0',
        'sm:w-auto sm:min-w-[140px] sm:justify-between sm:rounded-full sm:pl-1.5 sm:pr-3',
        'cursor-pointer bg-[#e8b001] border border-[#fae29a] hover:bg-[#d4a001]',
        'shadow-sm hover:shadow-md',
        'font-medium text-xs sm:text-sm md:text-base',
        isLoading && 'cursor-not-allowed opacity-75',
        className ?? '',
      ].join(' ')}
      disabled={isLoading}
    >
      <span className='text-[#e5ac00] border-[#fae29a] border bg-white rounded-full px-3 py-1.5 md:px-4 md:py-2 overflow-hidden whitespace-nowrap hidden sm:inline-flex font-bold'>
        {buttonLabel}
      </span>
      {isLoading ? (
        <Loader2 className='h-5 w-5 animate-spin text-white' />
      ) : (
        (icon ?? <ShoppingIconCustom className='h-6 w-6 shrink-0 text-white' />)
      )}
    </button>
  );

  if (!href) return Body;

  return (
    <Link
      href={href}
      target={openInNewTab ? '_blank' : undefined}
      rel={openInNewTab ? 'noopener noreferrer' : undefined}
      className='inline-flex'
      onClick={handleClick}
    >
      {Body}
    </Link>
  );
}
