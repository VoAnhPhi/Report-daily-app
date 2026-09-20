import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from 'src/common/services/prisma.service';
import { JwtPayload } from 'src/auth/jwt-payload';
import {
  BusinessFormTaskActivityResponseDto,
  BusinessFormTaskActivityReactionSummaryDto,
} from '../dto/business-form-response.dto';

const TASK_ADMIN_ROLES = new Set(['admin', 'moderator']);

@WebSocketGateway({
  namespace: '/tasks',
  cors: {
    origin: '*',
  },
})
export class BusinessFormTasksGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(BusinessFormTasksGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Tasks WebSocket Gateway initialized');
  }

  /**
   * Authenticate the socket via JWT (handshake.auth.token / Authorization header), then only join the `task_<id>` room if the user is allowed to see that task (owner / creator / main assignee / related user, or an admin). 
   * Otherwise the connection is rejected — prevents eavesdropping on a task's comments + reactions just by knowing its id.
   */
  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth as Record<string, string>)?.token ??
        (client.handshake.headers?.authorization as string | undefined)?.replace(
          /^Bearer\s+/i,
          '',
        );
      if (!token) throw new UnauthorizedException('Missing auth token');

      const payload = this.jwtService.verify<JwtPayload>(token);
      const userId = payload.id;
      const taskId = client.handshake.query.taskId as string;
      if (!taskId) {
        client.disconnect();
        return;
      }

      const task = await this.prisma.businessFormTask.findUnique({
        where: { id: taskId },
        select: {
          createdById: true,
          mainAssigneeId: true,
          businessForm: { select: { userId: true } },
          assignments: { select: { userId: true } },
        },
      });
      if (!task) {
        client.disconnect();
        return;
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      const isAdmin = !!user && TASK_ADMIN_ROLES.has(user.role);
      const allowed =
        isAdmin ||
        task.businessForm?.userId === userId ||
        task.createdById === userId ||
        task.mainAssigneeId === userId ||
        task.assignments.some((a) => a.userId === userId);
      if (!allowed) {
        this.logger.warn(
          `User ${userId} denied realtime access to task ${taskId}`,
        );
        client.disconnect();
        return;
      }

      client.data = { userId, taskId };
      client.join(`task_${taskId}`);
      this.logger.log(`Client ${client.id} (user ${userId}) joined task_${taskId}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Auth failed';
      this.logger.warn(`Tasks socket rejected: ${message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  /**
   * Broadcasts a new activity to clients watching a specific task.
   */
  emitActivityCreated(
    taskId: string,
    activity: BusinessFormTaskActivityResponseDto,
  ) {
    if (!this.server) return;
    this.server.to(`task_${taskId}`).emit('task_activity_created', {
      taskId,
      activity,
    });
  }

  /**
   * Broadcasts a reaction update to clients watching a specific task.
   */
  emitReactionUpdated(
    taskId: string,
    activityId: string,
    reactionSummary: BusinessFormTaskActivityReactionSummaryDto[],
  ) {
    if (!this.server) return;
    this.server.to(`task_${taskId}`).emit('task_reaction_updated', {
      taskId,
      activityId,
      reactionSummary,
    });
  }
}
