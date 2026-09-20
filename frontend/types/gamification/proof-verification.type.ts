/**
 * Proof Verification Types
 * Types for task proof verification system
 */

import { UserTaskMetadata } from './user-task-metadata.type';

export interface ProofImage {
  id: string;
  imageUrl: string;
  platform: string;
  uploadedAt: string;
  description: string;
}

export interface PendingVerification {
  id: string;
  status: string;
  currentCount: number;
  targetCount: number;
  submittedAt: string;
  createdAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  verifiedByUser?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  user: {
    id: string;
    fullName: string;
    email: string;
    referenceId: string;
  };
  task: {
    id: string;
    title: string;
    description: string;
    pointReward: number;
    experienceReward: number;
    code: string;
  };
  metadata: UserTaskMetadata;
}

export interface PendingVerificationsResponse {
  data: PendingVerification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
