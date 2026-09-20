/**
 * UserTask Metadata Types
 * Types for UserTask metadata field that can be edited by admins
 */

export interface UserTaskMetadata {
  // Proof submission fields
  proofImages?: Array<{
    id: string;
    imageUrl: string;
    platform: string;
    uploadedAt: string;
    description: string;
  }>;
  proofUrls?: string[];
  proofType?: string;
  
  // Submission tracking
  submittedAt?: string;
  taskType?: string;
  
  // Task details
  daySpecificTitle?: string;
  originalTitle?: string;
  dateString?: string;
  createdAt?: string;
  
  // User notes
  submissionNote?: string;
  
  // Admin fields
  adminComment?: string;
  adminVerified?: boolean;
  adminId?: string;
  adminNote?: string;
  verifiedAt?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  adminRejected?: boolean;
  
  // Metadata tracking
  updatedAt?: string;
  updatedBy?: string;
  
  // Resubmission tracking
  isResubmission?: boolean;
  previousSubmissionAt?: string;
  
  // Allow additional fields
  [key: string]: any;
}

export interface UpdateUserTaskMetadataDto {
  proofUrls?: string[];
  submissionNote?: string;
  adminComment?: string;
  proofType?: string;
  additionalFields?: Record<string, any>;
}

export interface UpdateUserTaskMetadataResponse {
  success: boolean;
  message: string;
  userTask: {
    id: string;
    userId: string;
    taskId: string;
    status: string;
    currentCount: number;
    targetCount: number;
    metadata: UserTaskMetadata;
    user: {
      id: string;
      fullName: string;
      email: string;
    };
    task: {
      id: string;
      title: string;
      code: string;
      pointReward: number;
      experienceReward: number;
    };
  };
}

