export interface TaskGroupMember {
  id: string;
  fullName: string;
  referenceId: string | null;
  avatarUrl: string | null;
  isOwner?: boolean;
}

export interface TaskGroup {
  id: string;
  name: string;
  members: TaskGroupMember[];
  createdAt: string;
  updatedAt: string;
  isOwner: boolean;
  isMember: boolean;
  viewerRole: 'owner' | 'member';
}

export interface CreateTaskGroupPayload {
  name: string;
  memberIds?: string[];
}

export interface UpdateTaskGroupPayload {
  name?: string;
  memberIds?: string[];
}
