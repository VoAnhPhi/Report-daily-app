'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { taskKeys } from '@/hooks/queries/task-queries';
import { useSession } from 'next-auth/react';
import { ReactionSummary, TaskActivity } from '@/types/task.type';

/**
 * Mở socket `/tasks` cho một task và làm mới cache React Query khi có sự kiện.
 *
 * Không trả về socket nữa: bản cũ `return socketRef.current` là đọc ref ngay
 * trong render — ref đổi thì không kích hoạt render lại nên nơi gọi luôn nhận
 * `null` ở lượt render đầu và không bao giờ được báo khi socket sẵn sàng. Nơi
 * duy nhất dùng hook (`components/tasks/task-detail-modal.tsx`) gọi
 * `useTaskSocket(task?.id || null)` và bỏ giá trị trả về, nên bỏ hẳn.
 */
export function useTaskSocket(taskId: string | null): void {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!taskId || !session?.user?.id || !session?.accessToken) return;

    const origin = (
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    ).replace(/\/+$/, '');
    const socket = io(
      `${origin}/tasks`,
      {
        reconnection: true,
        transports: ['websocket', 'polling'],
        auth: { token: session.accessToken },
        query: {
          userId: session.user.id,
          taskId: taskId,
        },
      },
    );

    socketRef.current = socket;

    // Lắng nghe sự kiện có activity mới được tạo
    socket.on('task_activity_created', (newActivity: TaskActivity) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.activities(taskId) });
      queryClient.invalidateQueries({ queryKey: ['task-activities'] });
    });

    // Lắng nghe sự kiện cập nhật reaction
    socket.on(
      'task_reaction_updated',
      (data: { activityId: string; reactionSummary: ReactionSummary[] }) => {
        queryClient.invalidateQueries({ queryKey: ['task-activities'] });
      },
    );

    return () => {
      socket.off('task_activity_created');
      socket.off('task_reaction_updated');
      socket.disconnect();
    };
  }, [taskId, session?.user?.id, session?.accessToken, queryClient]);
}
