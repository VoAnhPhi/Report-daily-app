import { Logger, OnModuleInit } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { ActivityLogResponseDto } from './dto/activity-log-response.dto';

export const ACTIVITY_LOGS_EVENTS = {
  LOG_CREATED: 'activity-log.created',
} as const;

/**
 * Socket.IO gateway for real-time activity log fan-out. Admin order detail
 * pages subscribe on mount (inside `OrderActivityLogSection`) so the log
 * panel refreshes without polling when another admin writes a new entry
 * on the same order.
 *
 * Rooms are keyed by `target:{targetType}:{targetId}` so subscribers only
 * receive events for the entity they are actively viewing.
 */
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/activity-logs',
})
export class ActivityLogsGateway implements OnModuleInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ActivityLogsGateway.name);

  onModuleInit() {
    this.logger.log('ActivityLogsGateway module initialized');

    // Lazily wire per-connection subscribe/unsubscribe for target rooms.
    // Clients emit `subscribe-target` with `{ targetType, targetId }` on
    // mount and `unsubscribe-target` on unmount.
    this.server?.on('connection', (socket) => {
      socket.on(
        'subscribe-target',
        (payload: { targetType?: string; targetId?: string }) => {
          if (!payload?.targetType || !payload?.targetId) return;
          const room = this.roomName(payload.targetType, payload.targetId);
          socket.join(room);
        },
      );
      socket.on(
        'unsubscribe-target',
        (payload: { targetType?: string; targetId?: string }) => {
          if (!payload?.targetType || !payload?.targetId) return;
          const room = this.roomName(payload.targetType, payload.targetId);
          socket.leave(room);
        },
      );
    });
  }

  private roomName(targetType: string, targetId: string): string {
    return `target:${targetType}:${targetId}`;
  }

  /**
   * Fan out a new ActivityLog to any client currently subscribed to the
   * target's room. Silent no-op when the gateway server is not ready yet
   * (e.g. during boot).
   */
  emitLogCreated(log: ActivityLogResponseDto): void {
    if (!this.server) return;
    try {
      const room = this.roomName(log.targetType, log.targetId);
      this.server.to(room).emit(ACTIVITY_LOGS_EVENTS.LOG_CREATED, log);
    } catch (error) {
      this.logger.warn(
        `Failed to emit activity-log.created for ${log.targetType}:${log.targetId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
