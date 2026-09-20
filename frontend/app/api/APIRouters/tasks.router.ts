export const tasks = {
  base: '/tasks',
  myTasks: '/tasks/my-tasks',
  myTasksCounts: '/tasks/my-tasks/counts',
  byId: (id: string) => `/tasks/${id}`,
  accept: (id: string) => `/tasks/${id}/accept`,
  updateStatus: (id: string) => `/tasks/${id}/status`,
  members: (id: string) => `/tasks/${id}/members`,
  sharedWith: (userId: string) => `/tasks/shared-with/${userId}`,
  sharedAssignees: '/tasks/shared-assignees',
  activities: (id: string) => `/tasks/${id}/activities`,
  activitiesById: (activityId: string) => `/tasks/activities/${activityId}`,
  activityReplies: (activityId: string) =>
    `/tasks/activities/${activityId}/replies`,
  activityReact: (activityId: string) =>
    `/tasks/activities/${activityId}/react`,
  leave: (id: string) => `/tasks/${id}/leave`,
  restore: (id: string) => `/tasks/${id}/restore`,
  pin: (id: string) => `/tasks/${id}/pin`,
} as const;

export const taskGroups = {
  base: '/task-groups',
  byId: (id: string) => `/task-groups/${id}`,
  leave: (id: string) => `/task-groups/${id}/leave`,
} as const;
