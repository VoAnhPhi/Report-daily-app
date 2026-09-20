import { Gender, UserStatus, Role } from '../user.type';

export interface UserStats {
  totalPoints: number;
  rank: number;
  totalUsers: number;
}

export interface UserProfile {
  id: string;
  referenceId: string;

  avatarUrl?: string;
  coverUrl?: string;

  email: string;
  fullName: string;
  phoneNumber: string;
  dob: Date;
  gender: Gender;

  country: string;

  bio?: string;
  website?: string;

  totalReferrals: number;
  totalFollowers: number;
  totalFollowing: number;
  totalPosts: number;

  verificationDate: Date;
  isActive: boolean;
  status: UserStatus;
  role: Role;
  isRecognizeUser?: boolean;
  
  // Recognized user information
  recognizedUser?: {
    id: string;
    userId: string;
    level?: number;
    metadata?: {
      sharing?: boolean;
      active?: boolean;
      professional?: boolean;
      business?: boolean;
      illuminator?: boolean;
      luminary?: boolean;
    };
    createdAt?: Date;
  };
  
  userPermissions?: Array<{
    id: string;
    granted: boolean;
    permission: {
      code: string;
    };
  }>;
  userAdminRoles?: Array<{
    id: string;
    role: {
      id: string;
      code: string;
      name: string;
    };
  }>;

  config?: Record<string, any>;

  // User stats
  userStats?: UserStats;

  // Add referrer information
  referrer?: {
    id: string;
    fullName: string;
    referenceId: string;
    avatarUrl?: string;
  };

  // Add addresses information
  addresses?: Array<{
    id: string;
    type: 'home' | 'work' | 'other';
    fullName: string;
    phone: string;
    street: string;
    ward?: string;
    district?: string;
    city: string;
    state?: string;
    country: string;
    postalCode?: string;
    placeId?: string;
    latitude?: number;
    longitude?: number;
    formattedAddress?: string;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  defaultAddressId?: string;
}
