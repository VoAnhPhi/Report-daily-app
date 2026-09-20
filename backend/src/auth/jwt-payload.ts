import { Gender, Role, UserStatus } from '@prisma/client';

// ! ONLY UNCHANGE DATA + TOKENSØ WILL COME HERE
export interface JwtPayload {
  id: string;
  email: string;
  phoneNumber: string;
  referenceId: string;
  accessToken?: string;
  businessId?: string | null;
}

export interface AuthUser {
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

  // Add referrer information
  referrer?: {
    id: string;
    fullName: string;
    referenceId: string;
    avatarUrl?: string;
  };
}
