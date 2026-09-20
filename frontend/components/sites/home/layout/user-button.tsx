'use client';

import { formatReferenceId } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useUserProfile } from '@/hooks/queries/user/user-profile-queries';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUserProfileModal } from '@/hooks/use-user-profile-modal';
import { useStores } from '@/hooks/useStores';
import { useAvatar } from '@/hooks/use-avatar';
import { useAuthPermissions } from '@/hooks/auth/use-auth-permissions';
import { Role, UserStatus } from '@/types/user.type';
import {
  Eye,
  LogOut,
  Shield,
  ShieldCheck,
  Clock,
  AlertCircle,
  DollarSign,
  CreditCard,
  Trophy,
  Check,
  Video,
  Building2,
  BookOpen,
  LayoutGrid,
} from 'lucide-react';
import { getGuidesOrigin } from '@/constants/notification-domains';
import { observer } from 'mobx-react-lite';
import { Session } from 'next-auth';
import { signOut, useSession } from 'next-auth/react';
import { signOutClearStorage } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/sites/home/common/language-context';
import { useAdminNavigation } from '@/hooks/use-navigation-loading';
import { canAccessAdminPanel } from '@/lib/permission-rbac';
import { UnifiedBadge, resolveDisplayBadges } from '../social/badges/unified-badge';

interface Props {
  session: Session;
}

export const UserButton = observer(({ session }: Props) => {
  const { onOpen } = useUserProfileModal();
  const { language, setLanguage, t } = useLanguage();
  // Access global avatar state
  const { userStore } = useStores();
  const router = useRouter();
  const { isNavigating, navigateToAdmin } = useAdminNavigation();

  // Fetch avatar via useAvatar to stay in sync with React Query cache
  const { avatarUrl: queriedAvatarUrl } = useAvatar();

  // Live session từ context: prop `session` được truyền từ server component nên
  // KHÔNG re-render khi gọi update() sau khi sửa profile. useSession() phản ứng
  // ngay với update({refreshUser:true}) → tên đổi không cần F5.
  const { data: liveSession } = useSession();
  const displayName = liveSession?.user?.fullName ?? session.user.fullName;

  // Fetch the current user's profile to get stored badge_preferences.
  // useUserProfile uses key ['user', 'profile', userId] — same key the
  // badge mutation writes to — so badges sync immediately after config.
  const { data: profileForBadges } = useUserProfile(session.user.id, {
    staleTime: 5 * 60 * 1000,
  });
  const badgePreferences =
    (
      profileForBadges as
        | { config?: { badge_preferences?: string[] | null } }
        | undefined
    )?.config?.badge_preferences ?? null;

  // Get permissions from AuthProvider (fetched separately, not in session cookie)
  const { permissions, adminRoles } = useAuthPermissions();

  // Get role from session
  const userRole = session.user.role;

  const hasAdminRoleFromUserAdminRoles =
    Array.isArray(adminRoles) && adminRoles.length > 0;

  const recognizedUserMetadata = session.user.recognizedUser?.metadata;
  const isSharingUser = recognizedUserMetadata?.sharing === true;
  const isIlluminatorUser = recognizedUserMetadata?.illuminator === true;
  const isLuminaryUser = recognizedUserMetadata?.luminary === true;
  const isModerator =
    (permissions && permissions.length > 0) ||
    (adminRoles && adminRoles.length > 0);

  const isProfessionalUser = recognizedUserMetadata?.professional === true;
  const isBusinessUser = recognizedUserMetadata?.business === true;
  const isActiveUser = recognizedUserMetadata?.active === true;
  const isDiamondUser = recognizedUserMetadata?.diamond === true;
  const isElderUser = recognizedUserMetadata?.elder === true;
  const isStarterUser = recognizedUserMetadata?.starter === true;
  // Professional ambassador should always see the Manage button
  const isAdmin =
    isModerator ||
    canAccessAdminPanel(permissions, userRole) ||
    hasAdminRoleFromUserAdminRoles;

  // Extract user status from session
  const userStatus = (session.user as any)?.status as UserStatus;

  const getKYCButtonProps = () => {
    switch (userStatus) {
      case UserStatus.MARKETING:
      case UserStatus.PENDING_KYC:
        return {
          icon: ShieldCheck,
          text: t('avatar.kyc.complete'),
          className:
            'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500',
          mobileIcon: ShieldCheck,
          mobileText: t('avatar.kyc.complete'),
          mobileClassName: 'text-yellow-700 hover:bg-yellow-50',
        };
      case UserStatus.PENDING:
        return {
          icon: AlertCircle,
          text: t('avatar.kyc.need_revision'),
          className:
            'bg-orange-500 hover:bg-orange-600 text-white border-orange-500',
          mobileIcon: AlertCircle,
          mobileText: t('avatar.kyc.need_revision'),
          mobileClassName: 'text-orange-700 hover:bg-orange-50',
        };
      case UserStatus.KYC_CHANGING:
        return {
          icon: AlertCircle,
          text: t('avatar.kyc.need_change'),
          className: 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500',
          mobileIcon: AlertCircle,
          mobileText: t('avatar.kyc.need_change'),
          mobileClassName: 'text-blue-700 hover:bg-blue-50',
        };
      case UserStatus.KYC_SUBMITTED:
        return {
          icon: Clock,
          text: t('avatar.kyc.processing'),
          className:
            'bg-purple-500 hover:bg-purple-600 text-white border-purple-500',
          mobileIcon: Clock,
          mobileText: t('avatar.kyc.processing'),
          mobileClassName: 'text-purple-700 hover:bg-purple-50',
        };
      case UserStatus.INACTIVE:
        return {
          icon: AlertCircle,
          text: t('avatar.kyc.verify_needed'),
          className: 'bg-red-500 hover:bg-red-600 text-white border-red-500',
          mobileIcon: AlertCircle,
          mobileText: t('avatar.kyc.verify_needed'),
          mobileClassName: 'text-red-700 hover:bg-red-50',
        };
      default:
        return null;
    }
  };

  const kycButtonProps = getKYCButtonProps();
  const shouldShowKYC = kycButtonProps && userStatus !== UserStatus.ACTIVE;

  const handleAdminClick = async () => {
    const success = await navigateToAdmin();
    if (!success) {
      console.error('Failed to navigate to admin page');
    }
  };

  const getStatusBackgroundColor = (status: UserStatus): string => {
    switch (status) {
      case UserStatus.MARKETING:
      case UserStatus.PENDING_KYC:
        return 'bg-yellow-100';
      case UserStatus.PENDING:
        return 'bg-orange-100';
      case UserStatus.KYC_CHANGING:
        return 'bg-blue-100';
      case UserStatus.KYC_SUBMITTED:
        return 'bg-purple-100';
      case UserStatus.INACTIVE:
        return 'bg-red-100';
      default:
        return 'bg-surface-muted';
    }
  };

  const getStatusIconColor = (status: UserStatus): string => {
    switch (status) {
      case UserStatus.MARKETING:
      case UserStatus.PENDING_KYC:
        return 'text-yellow-600';
      case UserStatus.PENDING:
        return 'text-orange-600';
      case UserStatus.KYC_CHANGING:
        return 'text-blue-600';
      case UserStatus.KYC_SUBMITTED:
        return 'text-purple-600';
      case UserStatus.INACTIVE:
        return 'text-red-600';
      default:
        return 'text-secondary';
    }
  };

  // Use avatar from hook first, then MobX store, then session as a final fallback
  const displayAvatarUrl =
    queriedAvatarUrl || userStore.avatarUrl || session.user.avatarUrl;

  return (
    <div className='flex items-center gap-3'>
      {shouldShowKYC && (
        <Button
          variant='outline'
          onClick={() => router.push('/kyc')}
          disabled={userStatus === UserStatus.KYC_SUBMITTED}
          size='sm'
          className={`hidden lg:flex items-center gap-2 text-xs border ${kycButtonProps.className}`}
        >
          <kycButtonProps.icon className='w-4 h-4' />
          <span className='font-medium'>{kycButtonProps.text}</span>
        </Button>
      )}
      {/* User Profile Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type='button'
            aria-label={displayName || 'Tài khoản người dùng'}
            className='relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] transition-transform active:scale-95 shrink-0'
          >
            <Avatar
              key={displayAvatarUrl}
              className='h-10 w-10 shrink-0 ring-2 ring-[#E8DDCC] hover:ring-amber-400 dark:ring-token transition-all duration-200 cursor-pointer overflow-hidden'
            >
              <AvatarImage
                src={displayAvatarUrl || '/placeholder.svg'}
                alt={displayName || 'User Avatar'}
                className='aspect-square h-full w-full object-cover object-center'
              />
              <AvatarFallback className='bg-linear-to-br from-yellow-400 to-orange-500 text-white text-sm font-bold'>
                {displayName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className='w-72 bg-surface border border-token shadow-xl rounded-2xl'
          align='end'
          forceMount
        >
          <DropdownMenuLabel className='font-normal p-4'>
            <div className='flex flex-col space-y-3'>
              <div className='flex items-center space-x-3'>
                <Avatar className='h-12 w-12 ring-3 ring-yellow-100 shadow-lg'>
                  <AvatarImage
                    src={displayAvatarUrl || '/placeholder-logo.svg'}
                    alt={displayName || 'User Avatar'}
                  />
                  <AvatarFallback className='bg-linear-to-br from-yellow-400 to-orange-500 text-white text-lg font-bold'>
                    {displayName}
                  </AvatarFallback>
                </Avatar>
                <div className='flex-1'>
                  <p className='text-base font-semibold leading-none text-primary'>
                    {displayName}
                  </p>
                  <p className='text-sm leading-none text-secondary mt-1'>
                    {formatReferenceId(session.user.referenceId)}
                  </p>
                </div>
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator className='bg-linear-to-r from-transparent via-gray-200 to-transparent' />

          {shouldShowKYC && (
            <DropdownMenuItem
              onClick={() => router.push('/kyc')}
              disabled={userStatus === UserStatus.KYC_SUBMITTED}
              className={`lg:hidden flex items-center px-4 py-3 transition-all duration-200 cursor-pointer ${kycButtonProps.mobileClassName}`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${getStatusBackgroundColor(userStatus)}`}
              >
                <kycButtonProps.mobileIcon
                  className={`h-4 w-4 ${getStatusIconColor(userStatus)}`}
                />
              </div>
              <span className='font-medium text-sm'>
                {kycButtonProps.mobileText}
              </span>
            </DropdownMenuItem>
          )}

          {isAdmin && (
            <>
              <DropdownMenuItem
                onClick={handleAdminClick}
                className='lg:hidden flex items-center px-4 py-3 text-primary hover:bg-surface-muted hover:text-member transition-all duration-200 cursor-pointer'
              >
                <div className='w-7 h-7 bg-purple-100 rounded-full flex items-center justify-center mr-3'>
                  <Shield className='h-4 w-4 text-purple-600' />
                </div>
                <span className='font-medium text-sm'>
                  {t('buttons.manage')}
                </span>
              </DropdownMenuItem>
            </>
          )}
          {/* {t('buttons.discount')} Button for Mobile */}
          <DropdownMenuItem
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.open('https://hoahong.acta.vn', '_blank');
              }
            }}
            className='lg:hidden flex items-center px-4 py-3 text-primary hover:bg-surface-muted transition-all duration-200 cursor-pointer'
          >
            <div className='w-7 h-7 bg-pink-100 rounded-full flex items-center justify-center mr-3'>
              <DollarSign className='h-4 w-4 text-pink-600' />
            </div>
            <span className='font-medium text-sm'>{t('buttons.discount')}</span>
          </DropdownMenuItem>
          {/* {t('buttons.meetings')} Button for Mobile */}
          <DropdownMenuItem
            onClick={() => router.push('/link-meetings')}
            className='lg:hidden flex items-center px-4 py-3 text-primary hover:bg-surface-muted transition-all duration-200 cursor-pointer'
          >
            <div className='w-7 h-7 bg-green-100 rounded-full flex items-center justify-center mr-3'>
              <Video className='h-4 w-4 text-green-600' />
            </div>
            <span className='font-medium text-sm'>{t('buttons.meetings')}</span>
          </DropdownMenuItem>
          {/* Business Button for Mobile */}
          <DropdownMenuItem
            onClick={() => router.push('/tasks')}
            className='lg:hidden flex items-center px-4 py-3 text-primary hover:bg-surface-muted transition-all duration-200 cursor-pointer'
          >
            <div className='w-7 h-7 bg-sky-100 rounded-full flex items-center justify-center mr-3'>
              <Building2 className='h-4 w-4 text-sky-600' />
            </div>
            <span className='font-medium text-sm'>{t('buttons.partners')}</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className='lg:hidden bg-linear-to-r from-transparent via-gray-200 to-transparent' />
          <DropdownMenuItem
            onClick={() => router.push('/kyc')}
            className='flex items-center px-4 py-3 text-primary hover:bg-surface-muted transition-all duration-200 cursor-pointer'
          >
            <div className='w-7 h-7 bg-green-100 rounded-full flex items-center justify-center mr-3'>
              <CreditCard className='h-4 w-4 text-green-600' />
            </div>
            <span className='font-medium text-sm'>{t('buttons.wallet')}</span>
          </DropdownMenuItem>

          {/* <DropdownMenuItem
            onClick={() => router.push('/gamification')}
            className='flex items-center px-4 py-3 text-primary hover:bg-surface-muted transition-all duration-200 cursor-pointer'
          >
            <div className='w-7 h-7 bg-yellow-100 rounded-full flex items-center justify-center mr-3'>
              <Trophy className='h-4 w-4 text-yellow-600' />
            </div>
            <span className='font-medium text-sm'>Hệ thống thưởng</span>
          </DropdownMenuItem> */}

          <DropdownMenuItem
            onClick={() => onOpen(session.user.id)}
            className='flex items-center px-4 py-3 text-primary hover:bg-surface-muted transition-all duration-200 cursor-pointer'
          >
            <div className='w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center mr-3'>
              <Eye className='h-4 w-4 text-blue-600' />
            </div>
            <span className='font-medium text-sm'>
              {t('avatar.view_profile')}
            </span>
          </DropdownMenuItem>

          {/* Cẩm nang ACTA — cổng hướng dẫn công khai (guides.acta.vn), mở tab
              mới vì là site khác. Origin tự đổi sang dev-guides.acta.vn khi
              đang chạy trên hạ tầng dev. */}
          {/*<DropdownMenuItem
            onClick={() =>
              window.open(getGuidesOrigin(), '_blank', 'noopener,noreferrer')
            }
            className='flex items-center px-4 py-3 text-primary hover:bg-surface-muted transition-all duration-200 cursor-pointer'
          >
            <div className='w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center mr-3'>
              <BookOpen className='h-4 w-4 text-amber-600' />
            </div>
            <span className='font-medium text-sm'>Cẩm nang ACTA</span>
          </DropdownMenuItem>*/}

          <DropdownMenuSeparator className='bg-linear-to-r from-transparent via-gray-200 to-transparent' />
          <DropdownMenuItem
            onClick={() =>
              signOutClearStorage({
                redirect: true,
                callbackUrl: `${process.env.NEXT_PUBLIC_CLIENT_URL || ''}/login`,
              })
            }
            className='flex items-center px-4 py-3 text-red-600 hover:bg-linear-to-r hover:from-red-50 hover:to-pink-50 hover:text-red-700 transition-all duration-200 cursor-pointer'
          >
            <div className='w-7 h-7 bg-red-100 rounded-full flex items-center justify-center mr-3'>
              <LogOut className='h-4 w-4 text-red-600' />
            </div>
            <span className='font-medium text-sm'>{t('avatar.logout')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});
