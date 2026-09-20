import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

type GamificationTaskEvent = {
  id: string;
  currentCount?: number;
  targetCount?: number;
  [key: string]: unknown;
};

type GamificationEntity = { id: string; [key: string]: unknown };

type LeaderboardEntry = { userId?: string; [key: string]: unknown };

type LevelUpRewards = { [key: string]: unknown };

type StreakInfo = { [key: string]: unknown };

export const GAMIFICATION_EVENTS = {
  // Task events
  TASK_CREATED: 'gamification:task:created',
  TASK_UPDATED: 'gamification:task:updated',
  TASK_DELETED: 'gamification:task:deleted',
  TASK_COMPLETED: 'gamification:task:completed',

  // Achievement events
  ACHIEVEMENT_CREATED: 'gamification:achievement:created',
  ACHIEVEMENT_UPDATED: 'gamification:achievement:updated',
  ACHIEVEMENT_DELETED: 'gamification:achievement:deleted',
  ACHIEVEMENT_UNLOCKED: 'gamification:achievement:unlocked',

  // Event events
  EVENT_CREATED: 'gamification:event:created',
  EVENT_UPDATED: 'gamification:event:updated',
  EVENT_DELETED: 'gamification:event:deleted',
  EVENT_STARTED: 'gamification:event:started',
  EVENT_ENDED: 'gamification:event:ended',

  // Shop events
  SHOP_ITEM_CREATED: 'gamification:shop:item:created',
  SHOP_ITEM_UPDATED: 'gamification:shop:item:updated',
  SHOP_ITEM_DELETED: 'gamification:shop:item:deleted',
  SHOP_ITEM_PURCHASED: 'gamification:shop:item:purchased',

  // Point events
  POINTS_AWARDED: 'gamification:points:awarded',
  POINTS_SPENT: 'gamification:points:spent',
  POINTS_ADJUSTED: 'gamification:points:adjusted',

  // Leaderboard events
  LEADERBOARD_UPDATED: 'gamification:leaderboard:updated',

  // Level events
  LEVEL_UP: 'gamification:level:up',

  // Streak events
  STREAK_UPDATED: 'gamification:streak:updated',
  STREAK_MILESTONE: 'gamification:streak:milestone',

  // Recognized users events
  NEW_RECOGNIZED_USERS: 'gamification:recognized-users:new',
};

@WebSocketGateway({
  namespace: '/gamification',
  cors: {
    origin: '*',
  },
})
export class GamificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('GamificationGateway');

  handleConnection(client: Socket, ..._args: unknown[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  handleJoinRoom(client: Socket, userId: string) {
    if (!userId) {
      this.logger.warn(`Client ${client.id} attempted to join without userId`);
      return;
    }

    // Join user-specific room
    client.join(userId);
    this.logger.log(`Client ${client.id} joined room for user ${userId}`);

    // Optionally, send confirmation back to client
    client.emit('joined', { userId, roomId: userId });
  }

  // ==================== TASK EVENTS ====================

  emitTaskCreated(task: GamificationTaskEvent) {
    this.server.emit(GAMIFICATION_EVENTS.TASK_CREATED, {
      task,
      timestamp: new Date().toISOString(),
    });
  }

  emitTaskUpdated(task: GamificationTaskEvent) {
    this.server.emit(GAMIFICATION_EVENTS.TASK_UPDATED, {
      task,
      timestamp: new Date().toISOString(),
    });
  }

  emitTaskUpdatedToUser(userId: string, task: GamificationTaskEvent) {
    // Emit task update to specific user
    this.server.to(userId).emit(GAMIFICATION_EVENTS.TASK_UPDATED, {
      task,
      timestamp: new Date().toISOString(),
    });
    this.logger.debug(
      `Emitted task update to user ${userId}: ${task.id} (${task.currentCount}/${task.targetCount})`,
    );
  }

  emitTaskDeleted(taskId: string) {
    this.server.emit(GAMIFICATION_EVENTS.TASK_DELETED, {
      taskId,
      timestamp: new Date().toISOString(),
    });
  }

  emitTaskCompleted(userId: string, task: GamificationTaskEvent) {
    // Emit to specific user
    this.server.to(userId).emit(GAMIFICATION_EVENTS.TASK_COMPLETED, {
      task,
      timestamp: new Date().toISOString(),
    });
  }

  // ==================== ACHIEVEMENT EVENTS ====================

  emitAchievementCreated(achievement: GamificationEntity) {
    this.server.emit(GAMIFICATION_EVENTS.ACHIEVEMENT_CREATED, {
      achievement,
      timestamp: new Date().toISOString(),
    });
  }

  emitAchievementUpdated(achievement: GamificationEntity) {
    this.server.emit(GAMIFICATION_EVENTS.ACHIEVEMENT_UPDATED, {
      achievement,
      timestamp: new Date().toISOString(),
    });
  }

  emitAchievementDeleted(achievementId: string) {
    this.server.emit(GAMIFICATION_EVENTS.ACHIEVEMENT_DELETED, {
      achievementId,
      timestamp: new Date().toISOString(),
    });
  }

  emitAchievementUnlocked(userId: string, achievement: GamificationEntity) {
    // Emit to specific user
    this.server.to(userId).emit(GAMIFICATION_EVENTS.ACHIEVEMENT_UNLOCKED, {
      achievement,
      timestamp: new Date().toISOString(),
    });
  }

  // ==================== EVENT EVENTS ====================

  emitEventCreated(event: GamificationEntity) {
    this.server.emit(GAMIFICATION_EVENTS.EVENT_CREATED, {
      event,
      timestamp: new Date().toISOString(),
    });
  }

  emitEventUpdated(event: GamificationEntity) {
    this.server.emit(GAMIFICATION_EVENTS.EVENT_UPDATED, {
      event,
      timestamp: new Date().toISOString(),
    });
  }

  emitEventDeleted(eventId: string) {
    this.server.emit(GAMIFICATION_EVENTS.EVENT_DELETED, {
      eventId,
      timestamp: new Date().toISOString(),
    });
  }

  emitEventStarted(event: GamificationEntity) {
    this.server.emit(GAMIFICATION_EVENTS.EVENT_STARTED, {
      event,
      timestamp: new Date().toISOString(),
    });
  }

  emitEventEnded(event: GamificationEntity) {
    this.server.emit(GAMIFICATION_EVENTS.EVENT_ENDED, {
      event,
      timestamp: new Date().toISOString(),
    });
  }

  // ==================== SHOP EVENTS ====================

  emitShopItemCreated(item: GamificationEntity) {
    this.server.emit(GAMIFICATION_EVENTS.SHOP_ITEM_CREATED, {
      item,
      timestamp: new Date().toISOString(),
    });
  }

  emitShopItemUpdated(item: GamificationEntity) {
    this.server.emit(GAMIFICATION_EVENTS.SHOP_ITEM_UPDATED, {
      item,
      timestamp: new Date().toISOString(),
    });
  }

  emitShopItemDeleted(itemId: string) {
    this.server.emit(GAMIFICATION_EVENTS.SHOP_ITEM_DELETED, {
      itemId,
      timestamp: new Date().toISOString(),
    });
  }

  emitShopItemPurchased(userId: string, purchase: GamificationEntity) {
    // Emit to all for shop updates
    this.server.emit(GAMIFICATION_EVENTS.SHOP_ITEM_PURCHASED, {
      purchase,
      timestamp: new Date().toISOString(),
    });

    // Also emit to specific user
    this.server.to(userId).emit(GAMIFICATION_EVENTS.SHOP_ITEM_PURCHASED, {
      purchase,
      timestamp: new Date().toISOString(),
    });
  }

  // ==================== POINT EVENTS ====================

  emitPointsAwarded(userId: string, points: number, reason: string) {
    this.server.to(userId).emit(GAMIFICATION_EVENTS.POINTS_AWARDED, {
      points,
      reason,
      timestamp: new Date().toISOString(),
    });
  }

  emitPointsSpent(userId: string, points: number, reason: string) {
    this.server.to(userId).emit(GAMIFICATION_EVENTS.POINTS_SPENT, {
      points,
      reason,
      timestamp: new Date().toISOString(),
    });
  }

  emitPointsAdjusted(userId: string, points: number, reason: string) {
    this.server.to(userId).emit(GAMIFICATION_EVENTS.POINTS_ADJUSTED, {
      points,
      reason,
      timestamp: new Date().toISOString(),
    });
  }

  // ==================== LEADERBOARD EVENTS ====================

  emitLeaderboardUpdated(leaderboard: LeaderboardEntry[]) {
    this.server.emit(GAMIFICATION_EVENTS.LEADERBOARD_UPDATED, {
      leaderboard,
      timestamp: new Date().toISOString(),
    });
  }

  // ==================== LEVEL EVENTS ====================

  emitLevelUp(userId: string, newLevel: number, rewards: LevelUpRewards) {
    this.server.to(userId).emit(GAMIFICATION_EVENTS.LEVEL_UP, {
      newLevel,
      rewards,
      timestamp: new Date().toISOString(),
    });
  }

  // ==================== STREAK EVENTS ====================

  emitStreakUpdated(userId: string, streak: StreakInfo) {
    this.server.to(userId).emit(GAMIFICATION_EVENTS.STREAK_UPDATED, {
      streak,
      timestamp: new Date().toISOString(),
    });
  }

  emitStreakMilestone(userId: string, milestone: number, rewards: LevelUpRewards) {
    this.server.to(userId).emit(GAMIFICATION_EVENTS.STREAK_MILESTONE, {
      milestone,
      rewards,
      timestamp: new Date().toISOString(),
    });
  }

  // ==================== RECOGNIZED USERS EVENTS ====================

  emitNewRecognizedUsers(users: Array<{ userId: string; fullName: string }>) {
    // Broadcast to all connected clients
    this.server.emit(GAMIFICATION_EVENTS.NEW_RECOGNIZED_USERS, {
      users,
      count: users.length,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(
      `🎉 Broadcasted ${users.length} new recognized users to all clients`,
    );
  }
}
