import { UserGender } from './enums/user.enum';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say',
}

export enum Role {
  ADMIN = 'admin',
  USER = 'user',
  COLLABORATOR = 'collaborator',
  MODERATOR = 'moderator',
  ADMIN_VOUCHER_GVC = 'admin_voucher_gvc',
}

export enum UserStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  PENDING_ADMIN = 'pending_admin',
  PENDING_KYC = 'pending_kyc',
  KYC_SUBMITTED = 'kyc_submitted',
  KYC_CHANGING = 'kyc_changing',
  INACTIVE = 'inactive',
  MARKETING = 'marketing',
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  action: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPermission {
  id: string;
  userId: string;
  permissionId: string;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  permission: Permission;
}

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  createdAt: Date;
  updatedAt: Date;
  permission: Permission;
}

export interface AdminRole {
  id: string;
  code: string;
  name: string;
  description: string;
  level: number;
  isSystem: boolean;
  color: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  rolePermissions?: RolePermission[];
}

export interface UserAdminRole {
  id: string;
  userId: string;
  roleId: string;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  role: AdminRole;
}

export interface SignupReferralUser {
  id: string;
  referenceId: string;
  avatar?: {
    fileName: string;
    fileUrl: string;
  };
  fullName: string;
  email: string;
}

export interface ReferralUser {
  id: string;
  referenceId: string;

  role: Role;
  avatarUrl?: string;
  coverUrl?: string;

  email: string;
  fullName: string;
  phoneNumber: string;
  dob: string;
  gender: Gender;
  country: string;

  verificationDate: Date;
  isActive: boolean;
  status: UserStatus;
  rejectedReason?: string;

  referrals: ReferralUser[];
  referralsCount: number;

  depth?: number;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;

  // Tab "Cổ đông" — tiến độ cổ đông cộng đồng của node (chỉ có ở tab Cổ đông,
  // do endpoint /users/shareholder-referrals trả về). Optional ở các tab khác.
  shareholderProgress?: ShareholderProgress;
}

/**
 * Tiến độ danh hiệu "Cổ đông lan tỏa" (x1/x2/x3) của một node — phản chiếu
 * ShareholderProgressDto bên acta-api; nguồn dữ liệu của thanh Tiến độ.
 *
 * ⚠ `sharingPoints` CHÍNH LÀ «điểm chính» — cơ sở duy nhất của cả ba danh hiệu;
 *   `nonBusinessPoints` KHÔNG phải. `x1Percent` ở bản API đang chạy (09/2026) còn
 *   trộn tiến độ KYC vào x1 (trái luật "x1 không đòi KYC"), nên thanh Tiến độ
 *   không đọc nó mà tự tính từ `sharingPoints` + `thresholds`.
 */
export interface ShareholderProgress {
  kycCount: number;
  kycRequired: number;
  sharingPoints: number;
  nonBusinessPoints: number;
  businessPoints: number;
  totalPoints: number;
  currentLevel: number;
  isShareholder: boolean;
  shareholderTypeCode: string | null;
  shareholderTypeName: string | null;
  shareholderLevel: number | null;
  x1Percent: number;
  thresholds: number[];
}

export interface RedirectResponse {
  redirectTo: string;
  type: 'error' | 'success';
  message: string;
}

export interface IUser {
  id: string;
  fullName?: string;
  email?: string;
  role: string;
  team?: string;
  lastSignInAt?: Date;
  isLocked?: boolean;
  referenceId?: string;
  userPermissions?: UserPermission[];
}

export interface IError {
  statusCode?: number;
  message?: string;
}

export interface IUserResponse {
  success?: boolean;
  data?: IUser;
  error?: IError;
}

export interface IGetUsersResponse {
  success?: boolean;
  data?: IUser[];
  error?: IError;
  total?: number;
}

export interface IDeleteUser {
  statusCode: number;
  error?: IError;
}

export interface IUserNames {
  id: string;
  fullName: string;
  email: string;
}

export interface ILoginForm {
  username: string;
  password: string;
}

export interface IRegisterForm {
  email?: string;
  password?: string;
  fullName: string;
  phoneNumber: string;
  cccdNumber?: string;
  gender?: UserGender;
  dob?: string;
  country?: string;
  referrerId?: string;
}

export interface IRefreshTokenForm {
  refreshToken: string;
  accessToken: string;
}

export interface AdminUserItem {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  referenceId: string;
  status: UserStatus;
  role: Role;
  createdAt: string;
  updatedAt: string;
  verificationDate?: string;
  rejectedReason?: string;
  dob?: string;
  gender?: Gender;
  country?: string;
  website?: string;
  bio?: string;
  avatar?: {
    fileUrl: string;
  };
  referrer?: {
    id: string;
    fullName: string;
    referenceId: string;
    avatar?: {
      fileUrl: string;
    };
  };
  business?: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    logo?: string;
    avatar?: string;
    website?: string;
    address?: string;
    type: 'expansion' | 'platform';
    verified: boolean;
    isActive: boolean;
    joinDate: string;
    createdAt: string;
    updatedAt: string;
    email?: string;
    phone?: string;
  };
  _count?: {
    referrals: number;
    posts: number;
    followers: number;
    following: number;
  };
  // Additional stats for admin view
  totalPosts?: number;
  totalPoints?: number;
  totalDirectReferrals?: number;
  userPermissions?: UserPermission[];
}

export interface RecognizedUserMetadata {
  sharing?: boolean;
  active?: boolean;
  professional?: boolean;
  business?: boolean;
  illuminator?: boolean;
  luminary?: boolean;
  diamond?: boolean;
  elder?: boolean;
  starter?: boolean;
  sharingLevel?: number;
  professionalLevel?: number;
  businessLevel?: number;
}

export interface RecognizedUser {
  id: string;
  userId: string;
  level?: number;
  metadata?: RecognizedUserMetadata;
  createdAt?: Date;
}

export interface UserReferenceResponse {
  id: string;

  fullName: string;
  avatarUrl?: string | null;
  status: UserStatus;
  referenceId: string;
  verificationDate?: Date | null;
  role: Role;
  isRecognizeUser?: boolean;
  userPermissions?: UserPermission[];
  userAdminRoles?: UserAdminRole[];
  recognizedUser?: RecognizedUser;
  badgePreferences?: string[] | null;
}

export interface PaginatedUsers {
  data: AdminUserItem[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginatedReferralUsers {
  data: ReferralUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ReferralUsersFilter {
  page?: number;
  limit?: number;
  type?: 'all' | 'direct' | 'indirect';
}

export interface UserFilter {
  searchTerm?: string;
  status?: UserStatus | 'all';
  page?: number;
  limit?: number;
}

export interface NewUser {
  id: string;
  fullName: string;
  avatar: {
    fileUrl: string;
  };
  referenceId: string;
  verificationDate: Date;
}
