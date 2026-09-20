'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { User } from 'lucide-react';

import { cn } from '@/lib/utils';

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
      className,
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, src, ...props }, ref) => {
  // Coi src rỗng / placeholder là "chưa có ảnh" → để AvatarFallback hiển thị.
  const hasRealSrc =
    typeof src === 'string' &&
    src.trim() !== '' &&
    !src.startsWith('/placeholder');

  if (!hasRealSrc) return null;

  return (
    <AvatarPrimitive.Image
      ref={ref}
      src={src}
      className={cn('aspect-square h-full w-full object-cover object-center', className)}
      {...props}
    />
  );
});
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, children: _children, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground',
      className,
    )}
    {...props}
  >
    <User className="h-1/2 w-1/2" />
  </AvatarPrimitive.Fallback>
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
