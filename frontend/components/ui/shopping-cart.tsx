'use client';
export default function ShoppingIconCustom({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      width='1em'
      height='1em'
      viewBox='0 0 48 48'
      fill='none'
      stroke='currentColor'
      strokeWidth={4}
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
      focusable='false'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path d='M3 6H6.5L8 12M8 12L13 32H39L44 12H8Z' />
      <circle cx='13' cy='39' r='3' />
      <circle cx='39' cy='39' r='3' />
    </svg>
  );
}
