import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  NotificationAction,
  PointTransactionType,
  Prisma,
  RelatedModel,
  StreakType,
  TaskStatus,
  TaskType,
  UserTaskStatus,
} from '@prisma/client';
import { AppCacheService } from '../common/cache/cache.service';
import { PrismaService } from '../common/services/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { ActivityEventDto } from './dto/activity-event.dto';
import { GamificationGateway } from './gamification.gateway';
import { PointAwardQueueService } from './services/point-award-queue.service';
import { ActivityType } from '@prisma/client';
import { computeSharingComposite } from '../recognized-users/utils/sharing-composite.util';

type TaskInfoSnapshot = {
  taskId: string;
  taskCode: string;
  taskTitle: string;
  taskType: string;
  taskIcon: string | null;
  pointReward: number;
  experienceReward: number;
  userTaskId: string;
  currentCount: number;
  targetCount: number;
};

type UserTaskUpdateEntry = {
  id: string;
  data: Prisma.UserTaskUpdateInput;
};

type UserTaskWithTaskRelation = Prisma.UserTaskGetPayload<{
  include: { task: true };
}>;

type UserActivityStatsWithUser = Prisma.UserActivityStatsGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        fullName: true;
        email: true;
        referenceId: true;
        avatar: {
          select: { fileUrl: true };
        };
      };
    };
  };
}>;

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  // ==================== CONSTANTS ====================
  private static readonly POINTS_PER_1000_VND = 3;
  private static readonly POINTS_PER_1000_VND_SPECIAL = 6; // Special products earn double points
  private static readonly POINTS_PER_1000_VND_PRIORITY = 9; // Priority products earn triple points
  private static readonly VND_UNIT = 1000;
  public static readonly POINTS_SUBORDINATE_KYC_COMPLETED = 500;
  public static readonly POINTS_SECOND_KYC_COMPLETED = 500;
  public static readonly POINTS_SUBORDINATE_SECOND_KYC_COMPLETED = 500;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => GamificationGateway))
    private readonly gamificationGateway: GamificationGateway,
    private readonly notificationService: NotificationService,
    private readonly pointAwardQueue: PointAwardQueueService,
    private readonly cacheService: AppCacheService,
  ) {}

  // ==================== POINTS & EXPERIENCE ====================

  async awardPoints(
    userId: string,
    amount: number,
    sourceType: string,
    sourceId?: string,
    multiplier: number = 1,
    description?: string,
    metadata?: Prisma.JsonObject,
    userTaskId?: string, // Add userTaskId parameter
    activityType?: string, // ActivityType for tracking
    useQueue?: boolean, // Option to use queue instead of transaction (default: auto-detect for ACTIVE_POST_LOGGED)
  ) {
    // For ACTIVE_POST_LOGGED, use queue to avoid transaction timeout
    // But allow override via useQueue parameter (explicit false = don't use queue)
    const shouldUseQueue =
      useQueue === true ||
      (useQueue === undefined && activityType === 'ACTIVE_POST_LOGGED');

    if (shouldUseQueue) {
      // Get task info if needed (for experience calculation)
      let experience = 0;
      if (
        userTaskId &&
        (sourceType === 'task' || sourceType === 'task_completion')
      ) {
        const userTask = await this.prisma.userTask.findUnique({
          where: { id: userTaskId },
          include: { task: { select: { experienceReward: true } } },
        });
        experience = userTask?.task?.experienceReward || 0;
      }

      await this.pointAwardQueue.enqueue({
        userId,
        amount,
        sourceType,
        sourceId,
        multiplier,
        description,
        metadata,
        activityType,
        experience,
        userTaskId, // Pass userTaskId for unique job tracking
      });
      return null; // Queue handles it asynchronously
    }
    try {
      const finalAmount = Math.floor(amount * multiplier);

      // Get or create user stats
      const stats = await this.getOrCreateUserStats(userId);

      // Calculate new balance
      const newBalance = stats.currentPoints + finalAmount;

      // If userTaskId is provided, get full task info to enrich metadata
      let taskIdFromUserTask: string | undefined = undefined;
      let taskInfo: TaskInfoSnapshot | null = null;
      if (
        userTaskId &&
        (sourceType === 'task' || sourceType === 'task_completion')
      ) {
        const userTask = await this.prisma.userTask.findUnique({
          where: { id: userTaskId },
          include: {
            task: {
              select: {
                id: true,
                code: true,
                title: true,
                type: true,
                icon: true,
                pointReward: true,
                experienceReward: true,
              },
            },
          },
        });
        if (userTask) {
          taskIdFromUserTask = userTask.taskId;
          taskInfo = {
            taskId: userTask.taskId,
            taskCode: userTask.task.code,
            taskTitle: userTask.task.title,
            taskType: userTask.task.type,
            taskIcon: userTask.task.icon,
            pointReward: userTask.task.pointReward,
            experienceReward: userTask.task.experienceReward,
            userTaskId: userTask.id,
            currentCount: userTask.currentCount,
            targetCount: userTask.targetCount,
          };
        }
      }

      // Enrich metadata with task info if available
      const enrichedMetadata = {
        ...metadata,
        ...(taskInfo ? { task: taskInfo } : {}),
      };

      // Create transaction
      const transaction = await this.prisma.activityPointTransaction.create({
        data: {
          userId,
          type: PointTransactionType.earn,
          points: finalAmount,
          balance: newBalance,
          experience: taskInfo?.experienceReward || 0,
          multiplier,
          sourceType,
          sourceId,
          sourceName: description,
          description,
          metadata: enrichedMetadata,
          activityType: activityType || undefined,
          // Set adminId if available in metadata (e.g., KYC approval flows)
          adminId:
            typeof metadata?.adminId === 'string'
              ? metadata.adminId
              : undefined,
          // Set taskId if sourceType is task-related
          taskId:
            taskIdFromUserTask ||
            ((sourceType === 'task' || sourceType === 'task_completion') &&
            sourceId
              ? sourceId
              : undefined),
          // Set userTaskId if provided
          userTaskId: userTaskId || undefined,
        },
      });

      // Update user stats
      await this.prisma.userActivityStats.update({
        where: { userId },
        data: {
          totalPoints: { increment: finalAmount },
          currentPoints: { increment: finalAmount },
          dailyPoints: { increment: finalAmount },
          weeklyPoints: { increment: finalAmount },
          monthlyPoints: { increment: finalAmount },
          yearlyPoints: { increment: finalAmount },
        },
      });

      this.logger.log(`Awarded ${finalAmount} points to user ${userId}`);

      // Emit socket event for real-time update in gamification widget
      this.gamificationGateway.emitPointsAwarded(
        userId,
        finalAmount,
        description || `Hoàn thành nhiệm vụ`,
      );

      // Invalidate gamification cache
      await this.cacheService.invalidateTags([
        'gamification:dashboard',
        'gamification:stats',
        'gamification:leaderboard',
        'gamification:my-rank',
        'gamification:points-history',
        'admin:gamification:proof-verification',
        'admin:gamification:proof-verification:pending',
        'admin:gamification:transactions',
      ]);

      return transaction;
    } catch (error) {
      this.logger.error(`Failed to award points to user ${userId}:`, error);
      throw error;
    }
  }

  async spendPoints(
    userId: string,
    amount: number,
    reason: string,
    description?: string,
  ) {
    try {
      const stats = await this.prisma.userActivityStats.findUnique({
        where: { userId },
      });

      if (!stats) {
        throw new NotFoundException('User stats not found');
      }

      if (stats.currentPoints < amount) {
        throw new BadRequestException('Insufficient points');
      }

      const newBalance = stats.currentPoints - amount;

      // Create transaction
      const transaction = await this.prisma.activityPointTransaction.create({
        data: {
          userId,
          type: PointTransactionType.spend,
          points: -amount,
          balance: newBalance,
          sourceType: 'spend',
          sourceName: reason,
          description,
        },
      });

      // Update user stats
      await this.prisma.userActivityStats.update({
        where: { userId },
        data: {
          currentPoints: { decrement: amount },
          spentPoints: { increment: amount },
        },
      });

      // Invalidate gamification cache
      await this.cacheService.invalidateTags([
        'gamification:stats',
        'gamification:dashboard',
        'gamification:points-history',
        'gamification:leaderboard',
        'admin:gamification:transactions',
      ]);

      this.logger.log(`User ${userId} spent ${amount} points on ${reason}`);

      return transaction;
    } catch (error) {
      this.logger.error(`Failed to spend points for user ${userId}:`, error);
      throw error;
    }
  }

  async calculateLevel(experience: number): Promise<number> {
    const levelConfig = await this.prisma.levelConfiguration.findMany({
      orderBy: { level: 'asc' },
    });

    let currentLevel = 1;
    for (const config of levelConfig) {
      if (
        experience >= config.experienceFrom &&
        experience < config.experienceTo
      ) {
        currentLevel = config.level;
        break;
      }
    }

    return currentLevel;
  }

  async levelUp(userId: string, newLevel: number) {
    try {
      const levelConfig = await this.prisma.levelConfiguration.findUnique({
        where: { level: newLevel },
      });

      if (!levelConfig) {
        this.logger.warn(`Level configuration not found for level ${newLevel}`);
        return null;
      }

      // Get user's current totalExperience to calculate remaining XP
      const userStats = await this.prisma.userActivityStats.findUnique({
        where: { userId },
        select: { totalExperience: true },
      });

      // Calculate remaining XP needed for next level
      // experienceToNext = experienceTo - totalExperience (remaining XP to next level)
      const experienceToNext = Math.max(
        0,
        levelConfig.experienceTo - (userStats?.totalExperience || 0),
      );

      // Update user stats
      await this.prisma.userActivityStats.update({
        where: { userId },
        data: {
          currentLevel: newLevel,
          experienceToNext: experienceToNext,
        },
      });

      // Award level-up bonus (only for levels 20+)
      if (newLevel >= 20 && levelConfig.pointReward > 0) {
        await this.awardPoints(
          userId,
          levelConfig.pointReward,
          'level_up',
          `level_${newLevel}`,
          1,
          `Level ${newLevel} bonus`,
        );
      }

      this.logger.log(`User ${userId} leveled up to ${newLevel}`);

      return levelConfig;
    } catch (error) {
      this.logger.error(`Failed to level up user ${userId}:`, error);
      throw error;
    }
  }

  // ==================== TASKS ====================

  async assignTaskToUser(userId: string, taskId: string) {
    try {
      const task = await this.prisma.task.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw new NotFoundException('Task not found');
      }

      // First, get ALL existing tasks for this user+task combination
      const existingTasks = await this.prisma.userTask.findMany({
        where: {
          userId,
          taskId,
        },
        orderBy: { createdAt: 'desc' },
      });

      // For periodic tasks (daily/weekly/monthly), check if user has task for current period
      if (
        task.type === 'daily' ||
        task.type === 'weekly' ||
        task.type === 'monthly'
      ) {
        const resetDate = this.getResetDate(task.type);

        // Check if there's a task in the current period
        const existingInCurrentPeriod = existingTasks.find(
          (ut) => ut.createdAt >= resetDate,
        );

        if (existingInCurrentPeriod) {
          this.logger.debug(
            `User ${userId} already has task ${taskId} for current period (${task.type})`,
          );
          return existingInCurrentPeriod;
        }

        // Spam prevention: Check if user already completed this task within the period
        const recentCompletion = existingTasks.find(
          (ut) =>
            (ut.status === 'completed' || ut.status === 'claimed') &&
            ut.completedAt &&
            ut.completedAt >= resetDate,
        );

        if (recentCompletion) {
          this.logger.debug(
            `User ${userId} already completed task ${taskId} in current period (${task.type})`,
          );
          return recentCompletion;
        }
      } else {
        // For one-time and repeatable tasks, check for active tasks
        const existingActive = existingTasks.find((ut) =>
          ['not_started', 'in_progress'].includes(ut.status),
        );

        if (existingActive) {
          this.logger.debug(`User ${userId} already has active task ${taskId}`);
          return existingActive;
        }

        // Check cooldown for repeatable tasks
        if (task.type === 'repeatable' && task.cooldownHours) {
          const cooldownDate = new Date();
          cooldownDate.setHours(cooldownDate.getHours() - task.cooldownHours);

          const recentCompletion = existingTasks.find(
            (ut) =>
              (ut.status === 'completed' || ut.status === 'claimed') &&
              ut.completedAt &&
              ut.completedAt >= cooldownDate,
          );

          if (recentCompletion) {
            const hoursRemaining = Math.ceil(
              (recentCompletion.completedAt!.getTime() +
                task.cooldownHours * 60 * 60 * 1000 -
                Date.now()) /
                (60 * 60 * 1000),
            );
            this.logger.debug(
              `Task ${taskId} is on cooldown for user ${userId}. ${hoursRemaining} hour(s) remaining.`,
            );
            return recentCompletion;
          }
        }
      }

      // Check if user already has an active task for this period
      const existingActiveTask = await this.prisma.userTask.findFirst({
        where: {
          userId,
          taskId,
          status: { in: ['not_started', 'in_progress'] },
        },
      });

      if (existingActiveTask) {
        this.logger.debug(
          `User ${userId} already has active task ${taskId}, returning existing`,
        );
        return existingActiveTask;
      }

      // Calculate next attemptNumber
      const maxAttemptNumber =
        existingTasks.length > 0
          ? Math.max(...existingTasks.map((ut) => ut.attemptNumber))
          : 0;
      const nextAttemptNumber = maxAttemptNumber + 1;

      // Create user task with correct attemptNumber
      // Start as in_progress so it can immediately receive points from activities
      const userTask = await this.prisma.userTask.create({
        data: {
          userId,
          taskId,
          status: UserTaskStatus.in_progress,
          currentCount: 0,
          targetCount: task.targetCount,
          expiresAt: task.endDate,
          attemptNumber: nextAttemptNumber,
          startedAt: new Date(),
        },
      });

      this.logger.log(
        `Assigned task ${taskId} to user ${userId} (attempt #${userTask.attemptNumber})`,
      );

      return userTask;
    } catch (error) {
      // Handle unique constraint violation gracefully
      if (error.code === 'P2002') {
        this.logger.warn(
          `Unique constraint violation for task ${taskId} and user ${userId}, fetching existing task`,
        );
        // Return the existing task instead of throwing
        const existing = await this.prisma.userTask.findFirst({
          where: {
            userId,
            taskId,
          },
          orderBy: { createdAt: 'desc' },
        });
        return existing;
      }

      this.logger.error(
        `Failed to assign task ${taskId} to user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async updateTaskProgress(
    userId: string,
    taskId: string,
    increment: number = 1,
  ) {
    try {
      const userTask = await this.prisma.userTask.findFirst({
        where: {
          userId,
          taskId,
          status: { in: ['not_started', 'in_progress'] },
        },
        include: { task: true },
      });

      if (!userTask) {
        this.logger.warn(
          `No active task found for user ${userId} and task ${taskId}`,
        );
        return null;
      }

      const newCount = userTask.currentCount + increment;
      const isReadyToComplete = newCount >= userTask.targetCount;

      // Update progress - DON'T auto-complete, just track progress
      const updated = await this.prisma.userTask.update({
        where: { id: userTask.id },
        data: {
          currentCount: newCount,
          status:
            userTask.status === 'not_started'
              ? UserTaskStatus.in_progress
              : userTask.status,
          startedAt: userTask.startedAt || new Date(),
        },
        include: { task: true },
      });

      // Emit real-time update to user via WebSocket
      this.gamificationGateway.emitTaskUpdatedToUser(userId, updated);

      this.logger.log(
        `Task progress updated for user ${userId}: ${taskId} (${newCount}/${userTask.targetCount})`,
      );

      if (isReadyToComplete) {
        this.logger.log(
          `Task ${taskId} is ready to complete for user ${userId} (manual completion required)`,
        );
      }

      return updated;
    } catch (error) {
      this.logger.error(
        `Failed to update task progress for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async completeTask(userId: string, taskId: string) {
    try {
      const userTask = await this.prisma.userTask.findFirst({
        where: {
          userId,
          taskId,
          status: UserTaskStatus.in_progress,
        },
        include: { task: true },
      });

      if (!userTask) {
        throw new NotFoundException('Active task not found');
      }

      // Verify task is actually ready to complete
      if (userTask.currentCount < userTask.targetCount) {
        throw new BadRequestException(
          `Task not ready to complete. Progress: ${userTask.currentCount}/${userTask.targetCount}`,
        );
      }

      // Check for spam prevention - prevent duplicate completion within cooldown
      if (
        userTask.task.type === 'daily' ||
        userTask.task.type === 'weekly' ||
        userTask.task.type === 'monthly'
      ) {
        const recentCompletion = await this.prisma.userTask.findFirst({
          where: {
            userId,
            taskId,
            status: { in: ['completed', 'claimed'] },
            completedAt: { gte: this.getResetDate(userTask.task.type) },
          },
        });

        if (recentCompletion) {
          throw new BadRequestException(
            `You have already completed this ${userTask.task.type} task. Please wait for the next reset.`,
          );
        }
      }

      // Check cooldown for repeatable tasks
      if (userTask.task.type === 'repeatable' && userTask.task.cooldownHours) {
        const cooldownDate = new Date();
        cooldownDate.setHours(
          cooldownDate.getHours() - userTask.task.cooldownHours,
        );

        const recentCompletion = await this.prisma.userTask.findFirst({
          where: {
            userId,
            taskId,
            status: { in: ['completed', 'claimed'] },
            completedAt: { gte: cooldownDate },
          },
        });

        if (recentCompletion) {
          throw new BadRequestException(
            `Task is on cooldown. Please wait ${userTask.task.cooldownHours} hours between completions.`,
          );
        }
      }

      const updated = await this.prisma.userTask.update({
        where: { id: userTask.id },
        data: {
          status: UserTaskStatus.completed,
          completedAt: new Date(),
          currentCount: userTask.targetCount,
        },
        include: { task: true },
      });

      this.logger.log(`Task ${taskId} marked as completed for user ${userId}`);

      return updated;
    } catch (error) {
      this.logger.error(`Failed to complete task for user ${userId}:`, error);
      throw error;
    }
  }

  private getResetDate(taskType: string): Date {
    const now = new Date();
    const resetDate = new Date();

    switch (taskType) {
      case 'daily':
        resetDate.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        const dayOfWeek = now.getDay();
        resetDate.setDate(now.getDate() - dayOfWeek);
        resetDate.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        resetDate.setDate(1);
        resetDate.setHours(0, 0, 0, 0);
        break;
      default:
        resetDate.setHours(0, 0, 0, 0);
    }

    return resetDate;
  }

  async claimTaskReward(userId: string, taskId: string) {
    try {
      const userTask = await this.prisma.userTask.findFirst({
        where: {
          userId,
          id: taskId,
          status: UserTaskStatus.completed,
        },
        include: { task: true },
      });

      if (!userTask) {
        throw new NotFoundException('Completed task not found');
      }

      if (userTask.status === UserTaskStatus.claimed) {
        throw new BadRequestException('Reward already claimed');
      }

      // Award points
      const points = userTask.task.pointReward;
      const experience = userTask.task.experienceReward;

      if (points > 0) {
        await this.awardPoints(
          userId,
          points,
          'task',
          taskId,
          1,
          `Task: ${userTask.task.title}`,
          undefined, // metadata
          userTask.id, // userTaskId - link to specific user task instance
        );

        // Create notification for user
        await this.notificationService.createNotificationWithCounter({
          userId,
          relatedModel: RelatedModel.system,
          relatedModelId: userTask.id,
          action: NotificationAction.task_points_earned,
          message: `🎉 Bạn đã nhận được ${points} điểm từ nhiệm vụ "${userTask.task.title}"`,
          linkUrl: '',
        });
      }

      // Add experience
      if (experience > 0) {
        await this.addExperience(userId, experience);
      }

      // Update task status
      const updated = await this.prisma.userTask.update({
        where: { id: userTask.id },
        data: {
          status: UserTaskStatus.claimed,
          claimedAt: new Date(),
          pointsEarned: points,
          experienceEarned: experience,
        },
      });

      // Update task completion count
      await this.prisma.task.update({
        where: { id: taskId },
        data: {
          completionCount: { increment: 1 },
        },
      });

      // Update user stats
      await this.prisma.userActivityStats.update({
        where: { userId },
        data: {
          tasksCompleted: { increment: 1 },
          dailyTasksCompleted:
            userTask.task.type === 'daily' ? { increment: 1 } : undefined,
          weeklyTasksCompleted:
            userTask.task.type === 'weekly' ? { increment: 1 } : undefined,
        },
      });

      this.logger.log(`User ${userId} claimed reward for task ${taskId}`);

      return updated;
    } catch (error) {
      this.logger.error(
        `Failed to claim task reward for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async resetDailyTasks() {
    try {
      // NOTE: Daily tasks are now handled by DailyTasksCron at midnight (00:00)
      // This function is kept for backward compatibility but only resets stats
      // The cron job at 00:00 will handle deleting and recreating daily tasks

      // We no longer expire daily tasks here - the daily-tasks.cron.ts handles it
      // by deleting and recreating them, which is cleaner than setting expired status

      // Reset daily stats only
      await this.prisma.userActivityStats.updateMany({
        data: {
          dailyPoints: 0,
          dailyActivities: 0,
          dailyTasksCompleted: 0,
          lastDailyReset: new Date(),
        },
      });

      this.logger.log(
        'Daily stats reset completed (daily tasks handled by DailyTasksCron)',
      );
    } catch (error) {
      this.logger.error('Failed to reset daily tasks:', error);
      throw error;
    }
  }

  async resetWeeklyTasks() {
    try {
      await this.prisma.userTask.updateMany({
        where: {
          task: { type: 'weekly' },
          status: { in: ['not_started', 'in_progress'] },
        },
        data: {
          status: UserTaskStatus.expired,
        },
      });

      await this.prisma.userActivityStats.updateMany({
        data: {
          weeklyPoints: 0,
          weeklyActivities: 0,
          weeklyTasksCompleted: 0,
          lastWeeklyReset: new Date(),
        },
      });

      this.logger.log('Weekly tasks reset completed');
    } catch (error) {
      this.logger.error('Failed to reset weekly tasks:', error);
      throw error;
    }
  }

  async resetMonthlyTasks() {
    try {
      await this.prisma.userTask.updateMany({
        where: {
          task: { type: 'monthly' },
          status: { in: ['not_started', 'in_progress'] },
        },
        data: {
          status: UserTaskStatus.expired,
        },
      });

      await this.prisma.userActivityStats.updateMany({
        data: {
          monthlyPoints: 0,
          monthlyActivities: 0,
          lastMonthlyReset: new Date(),
        },
      });

      this.logger.log('Monthly tasks reset completed');
    } catch (error) {
      this.logger.error('Failed to reset monthly tasks:', error);
      throw error;
    }
  }

  // ==================== ACHIEVEMENTS ====================

  async checkAchievementProgress(userId: string, activityType: string) {
    try {
      const achievements = await this.prisma.achievement.findMany({
        where: {
          isActive: true,
          requiredActivityTypes: {
            has: activityType,
          },
        },
      });

      for (const achievement of achievements) {
        await this.updateAchievementProgress(
          userId,
          achievement.id,
          activityType,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to check achievement progress for user ${userId}:`,
        error,
      );
    }
  }

  async updateAchievementProgress(
    userId: string,
    achievementId: string,
    activityType: string,
  ) {
    try {
      const achievement = await this.prisma.achievement.findUnique({
        where: { id: achievementId },
      });

      if (!achievement) return;

      // Get or create user achievement
      const userAchievement = await this.prisma.userAchievement.upsert({
        where: {
          userId_achievementId: {
            userId,
            achievementId,
          },
        },
        update: {},
        create: {
          userId,
          achievementId,
          currentProgress: 0,
          targetProgress: achievement.requiredCount,
          isUnlocked: false,
        },
      });

      if (userAchievement.isUnlocked) return;

      // Increment progress
      const newProgress = userAchievement.currentProgress + 1;
      const progressPercent = (newProgress / achievement.requiredCount) * 100;
      const isUnlocked = newProgress >= achievement.requiredCount;

      await this.prisma.userAchievement.update({
        where: { id: userAchievement.id },
        data: {
          currentProgress: newProgress,
          progressPercent,
          isUnlocked,
          unlockedAt: isUnlocked ? new Date() : undefined,
        },
      });

      if (isUnlocked) {
        await this.unlockAchievement(userId, achievementId);
      }
    } catch (error) {
      this.logger.error(`Failed to update achievement progress:`, error);
    }
  }

  async unlockAchievement(userId: string, achievementId: string) {
    try {
      const achievement = await this.prisma.achievement.findUnique({
        where: { id: achievementId },
      });

      if (!achievement) {
        throw new NotFoundException('Achievement not found');
      }

      // Award points and experience
      if (achievement.pointReward > 0) {
        await this.awardPoints(
          userId,
          achievement.pointReward,
          'achievement',
          achievementId,
          1,
          `Achievement: ${achievement.name}`,
        );
      }

      if (achievement.experienceReward > 0) {
        await this.addExperience(userId, achievement.experienceReward);
      }

      // Update achievement stats
      await this.prisma.achievement.update({
        where: { id: achievementId },
        data: {
          unlockedCount: { increment: 1 },
        },
      });

      // Update user stats
      await this.prisma.userActivityStats.update({
        where: { userId },
        data: {
          achievementsUnlocked: { increment: 1 },
        },
      });

      this.logger.log(`User ${userId} unlocked achievement ${achievementId}`);
    } catch (error) {
      this.logger.error(`Failed to unlock achievement:`, error);
      throw error;
    }
  }

  async pinAchievement(userId: string, achievementId: string) {
    try {
      // Unpin all other achievements
      await this.prisma.userAchievement.updateMany({
        where: {
          userId,
          isPinned: true,
        },
        data: {
          isPinned: false,
        },
      });

      // Pin this achievement
      await this.prisma.userAchievement.update({
        where: {
          userId_achievementId: {
            userId,
            achievementId,
          },
        },
        data: {
          isPinned: true,
        },
      });

      this.logger.log(`User ${userId} pinned achievement ${achievementId}`);
    } catch (error) {
      this.logger.error(`Failed to pin achievement:`, error);
      throw error;
    }
  }

  // ==================== STREAKS ====================

  async updateStreak(userId: string, streakType: StreakType) {
    try {
      const streak = await this.prisma.userStreak.upsert({
        where: {
          userId_streakType: {
            userId,
            streakType,
          },
        },
        update: {},
        create: {
          userId,
          streakType,
          currentStreak: 0,
          longestStreak: 0,
          isActive: true,
          isBroken: false,
        },
      });

      const now = new Date();
      const lastActive = streak.lastActiveDate;

      if (!lastActive) {
        // First time streak
        await this.prisma.userStreak.update({
          where: { id: streak.id },
          data: {
            currentStreak: 1,
            longestStreak: 1,
            lastActiveDate: now,
          },
        });
        return;
      }

      const daysSinceLastActive = Math.floor(
        (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysSinceLastActive === 0) {
        // Same day, no change
        return;
      } else if (daysSinceLastActive === 1) {
        // Consecutive day, increment streak
        const newStreak = streak.currentStreak + 1;
        const newLongest = Math.max(newStreak, streak.longestStreak);

        await this.prisma.userStreak.update({
          where: { id: streak.id },
          data: {
            currentStreak: newStreak,
            longestStreak: newLongest,
            lastActiveDate: now,
          },
        });

        // Check milestone
        await this.checkStreakMilestone(userId, streakType, newStreak);
      } else {
        // Streak broken
        await this.breakStreak(userId, streakType);
      }
    } catch (error) {
      this.logger.error(`Failed to update streak for user ${userId}:`, error);
    }
  }

  async checkStreakMilestone(
    userId: string,
    streakType: StreakType,
    days: number,
  ) {
    const milestones = [7, 14, 30, 60, 100, 365];

    if (milestones.includes(days)) {
      const reward = days * 10; // 10 points per milestone day
      await this.awardPoints(
        userId,
        reward,
        'streak_milestone',
        `${streakType}_${days}`,
        1,
        `${days}-day ${streakType} streak milestone`,
      );

      this.logger.log(
        `User ${userId} reached ${days}-day ${streakType} streak milestone`,
      );
    }
  }

  async useStreakFreeze(userId: string, streakType: StreakType) {
    try {
      const streak = await this.prisma.userStreak.findUnique({
        where: {
          userId_streakType: {
            userId,
            streakType,
          },
        },
      });

      if (!streak) {
        throw new NotFoundException('Streak not found');
      }

      if (streak.freezesAvailable <= 0) {
        throw new BadRequestException('No streak freezes available');
      }

      await this.prisma.userStreak.update({
        where: { id: streak.id },
        data: {
          freezesAvailable: { decrement: 1 },
          freezesUsed: { increment: 1 },
          lastFreezeDate: new Date(),
          lastActiveDate: new Date(),
        },
      });

      // Invalidate streak and dashboard cache
      await this.cacheService.invalidateTags([
        'gamification:streaks',
        'gamification:dashboard',
      ]);

      this.logger.log(`User ${userId} used a streak freeze for ${streakType}`);
    } catch (error) {
      this.logger.error(`Failed to use streak freeze:`, error);
      throw error;
    }
  }

  async breakStreak(userId: string, streakType: StreakType) {
    try {
      await this.prisma.userStreak.updateMany({
        where: {
          userId,
          streakType,
        },
        data: {
          currentStreak: 0,
          isBroken: true,
          brokenAt: new Date(),
        },
      });

      this.logger.log(`Streak ${streakType} broken for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to break streak:`, error);
    }
  }

  // ==================== LEADERBOARDS ====================

  async updateLeaderboard(leaderboardId: string) {
    try {
      const leaderboard = await this.prisma.leaderboard.findUnique({
        where: { id: leaderboardId },
      });

      if (!leaderboard) {
        throw new NotFoundException('Leaderboard not found');
      }

      let scoreField: string;
      switch (leaderboard.metric) {
        case 'points':
          scoreField =
            leaderboard.type === 'daily'
              ? 'dailyPoints'
              : leaderboard.type === 'weekly'
                ? 'weeklyPoints'
                : 'totalPoints';
          break;
        case 'tasks':
          scoreField = 'tasksCompleted';
          break;
        case 'achievements':
          scoreField = 'achievementsUnlocked';
          break;
        default:
          scoreField = 'totalPoints';
      }

      // Get top users
      const topUsers = await this.prisma.userActivityStats.findMany({
        where: {
          [scoreField]: { gt: 0 },
        },
        orderBy: {
          [scoreField]: 'desc',
        },
        take: 100,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              avatar: true,
            },
          },
        },
      });

      // Delete existing entries
      await this.prisma.leaderboardEntry.deleteMany({
        where: { leaderboardId },
      });

      // Create new entries
      const entries = topUsers.map((stats, index) => {
        const user = (stats as UserActivityStatsWithUser).user;
        return {
          leaderboardId,
          userId: stats.userId,
          rank: index + 1,
          score: stats[scoreField] as number,
          userDisplayName: user?.fullName || 'Unknown',
          userAvatar: user?.avatar?.fileUrl || null,
          userLevel: stats.currentLevel,
        };
      });

      await this.prisma.leaderboardEntry.createMany({
        data: entries,
      });

      this.logger.log(
        `Updated leaderboard ${leaderboardId} with ${entries.length} entries`,
      );
    } catch (error) {
      this.logger.error(`Failed to update leaderboard:`, error);
      throw error;
    }
  }

  async getUserRank(userId: string, leaderboardType: string) {
    try {
      const leaderboard = await this.prisma.leaderboard.findFirst({
        where: {
          type: leaderboardType,
          isActive: true,
        },
      });

      if (!leaderboard) {
        return null;
      }

      const entry = await this.prisma.leaderboardEntry.findUnique({
        where: {
          leaderboardId_userId: {
            leaderboardId: leaderboard.id,
            userId,
          },
        },
      });

      return entry;
    } catch (error) {
      this.logger.error(`Failed to get user rank:`, error);
      return null;
    }
  }

  async getTopUsers(leaderboardType: string, limit: number = 10) {
    try {
      const leaderboard = await this.prisma.leaderboard.findFirst({
        where: {
          type: leaderboardType,
          isActive: true,
        },
      });

      if (!leaderboard) {
        return [];
      }

      const entries = await this.prisma.leaderboardEntry.findMany({
        where: { leaderboardId: leaderboard.id },
        orderBy: { rank: 'asc' },
        take: limit,
      });

      return entries;
    } catch (error) {
      this.logger.error(`Failed to get top users:`, error);
      return [];
    }
  }

  // ==================== STATS ====================

  async updateUserStats(
    userId: string,
    changes: Partial<Prisma.UserActivityStatsUpdateInput>,
  ) {
    try {
      await this.prisma.userActivityStats.update({
        where: { userId },
        data: changes,
      });
    } catch (error) {
      this.logger.error(`Failed to update user stats:`, error);
    }
  }

  async resetPeriodicStats(period: 'daily' | 'weekly' | 'monthly') {
    try {
      const updateData: Prisma.UserActivityStatsUpdateManyMutationInput = {};

      switch (period) {
        case 'daily':
          updateData.dailyPoints = 0;
          updateData.dailyActivities = 0;
          updateData.dailyTasksCompleted = 0;
          updateData.lastDailyReset = new Date();
          break;
        case 'weekly':
          updateData.weeklyPoints = 0;
          updateData.weeklyActivities = 0;
          updateData.weeklyTasksCompleted = 0;
          updateData.lastWeeklyReset = new Date();
          break;
        case 'monthly':
          updateData.monthlyPoints = 0;
          updateData.monthlyActivities = 0;
          updateData.lastMonthlyReset = new Date();
          break;
      }

      await this.prisma.userActivityStats.updateMany({
        data: updateData,
      });

      this.logger.log(`Reset ${period} stats for all users`);
    } catch (error) {
      this.logger.error(`Failed to reset ${period} stats:`, error);
    }
  }

  // ==================== ACTIVITY TRACKING ====================

  async onActivity(event: ActivityEventDto) {
    const { userId, activityType, targetId, metadata } = event;

    this.logger.log(
      `🎮 [Gamification] onActivity called - userId: ${userId}, activityType: ${activityType}, targetId: ${targetId}, metadata: ${JSON.stringify(metadata)}`,
    );

    try {
      // ⚡ REMOVED QUEUE - Process activity points IMMEDIATELY to prevent missing points
      // Old code: await this.queueService.enqueue(userId, activityType, targetId || userId);
      // New code: Process directly without queue
      await this.updateTasksAndAwardPoints(userId, activityType, metadata);
      this.logger.log(
        `✅ [Gamification] updateTasksAndAwardPoints completed for user ${userId}, activityType ${activityType}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ [Gamification] Failed to process activity for user ${userId}, activityType ${activityType}: ${error.message}`,
        error.stack,
      );
      // Don't throw - log error but don't break the flow
    }
  }

  /**
   * Calculate points for order completion based on order total and product type
   * Formula: 1000 VND = POINTS_PER_1000_VND points (normal/special/priority/custom)
   * - Normal products: 3 points per 1000 VND
   * - Special products: 6 points per 1000 VND (×2)
   * - Priority products: 9 points per 1000 VND (×3)
   * - Custom products: X points per 1000 VND (admin-defined via customPointsPer1000)
   */
  private calculateOrderPoints(
    orderTotal: number,
    productType: 'regular' | 'special' | 'priority' | 'custom' = 'regular',
    customPointsPer1000?: number,
  ): number {
    if (!orderTotal || orderTotal <= 0) return 0;
    let pointsPerUnit: number;
    switch (productType) {
      case 'special':
        pointsPerUnit = GamificationService.POINTS_PER_1000_VND_SPECIAL;
        break;
      case 'priority':
        pointsPerUnit = GamificationService.POINTS_PER_1000_VND_PRIORITY;
        break;
      case 'custom':
        pointsPerUnit = customPointsPer1000 ?? GamificationService.POINTS_PER_1000_VND;
        break;
      default: // 'regular' (default)
        pointsPerUnit = GamificationService.POINTS_PER_1000_VND;
        break;
    }
    return Math.round(
      (orderTotal / GamificationService.VND_UNIT) * pointsPerUnit,
    );
  }

  /**
   * Calculate points for order with special and priority product support
   * Returns separate points for normal, special, and priority products
   */
  private calculateOrderPointsWithSpecial(
    normalProductsTotal: number,
    specialProductsTotal: number,
    priorityProductsTotal: number = 0,
  ): {
    normalPoints: number;
    specialPoints: number;
    priorityPoints: number;
    totalPoints: number;
  } {
    const normalPoints = this.calculateOrderPoints(normalProductsTotal, 'regular');
    const specialPoints = this.calculateOrderPoints(specialProductsTotal, 'special');
    const priorityPoints = this.calculateOrderPoints(priorityProductsTotal, 'priority');
    return {
      normalPoints,
      specialPoints,
      priorityPoints,
      totalPoints: normalPoints + specialPoints + priorityPoints,
    };
  }

  /**
   * Optimized method that combines task progress updates, point awarding, and user stats updates
   * in a single transaction to reduce database round trips and prevent race conditions
   */
  private async updateTasksAndAwardPoints(
    userId: string,
    activityType: string,
    metadata?: Prisma.JsonObject,
  ) {
    this.logger.log(
      `🔍 [Gamification] updateTasksAndAwardPoints called - userId: ${userId}, activityType: ${activityType}`,
    );

    // ORDER_COMPLETED types bypass UserTask entirely — points are awarded directly
    // from the active Task config so new users and existing users are treated identically
    // without requiring a UserTask assignment.
    if (
      activityType === ActivityType.ORDER_COMPLETED ||
      activityType === ActivityType.ORDER_COMPLETED_PRIORITY_PRODUCT ||
      activityType === ActivityType.ORDER_COMPLETED_SPECIAL_PRODUCT
    ) {
      await this.awardOrderActivityPoints(userId, activityType, metadata);
      return;
    }

    // KYC points bypass UserTask entirely so every beneficiary is paid the same
    // fixed amount, whether or not a UserTask happens to be assigned to them.
    // Routing these through the task pipeline made the payout depend on task
    // assignment and on the task's configured reward, which drifted away from
    // the intended amounts.
    if (
      activityType === ActivityType.SUBORDINATE_KYC_COMPLETED ||
      activityType === ActivityType.SECOND_KYC_COMPLETED ||
      activityType === ActivityType.SUBORDINATE_SECOND_KYC_COMPLETED
    ) {
      await this.awardKycActivityPoints(userId, activityType, metadata);
      return;
    }

    try {
      // 1. Get all active tasks that match this activity type (including repeatable)
      // NOTE: Only checks in_progress. Tasks must be transitioned from not_started → in_progress
      // via backfill endpoint or assignTask flow before points can be awarded.
      const userTasks = await this.prisma.userTask.findMany({
        where: {
          userId,
          status: UserTaskStatus.in_progress,
          task: {
            requiredActivityTypes: {
              has: activityType,
            },
          },
        },
        include: {
          task: true,
        },
      });

      // 🔍 CRITICAL: If no tasks found, no points can be awarded.
      // KYC activity types never reach here — they are paid directly via
      // awardKycActivityPoints() before the UserTask lookup above.
      if (userTasks.length === 0) {
        this.logger.warn(
          `⚠️ [Gamification] NO TASKS FOUND for user ${userId} with activityType ${activityType} and status in_progress - NO POINTS WILL BE AWARDED`,
        );
        return;
      }

      let totalPointsToAward = 0;
      let totalExperienceToAward = 0;
      const completedTasks: UserTaskWithTaskRelation[] = [];
      const tasksToUpdate: UserTaskUpdateEntry[] = [];

      // Calculate dynamic points for ORDER_COMPLETED, ORDER_COMPLETED_PRIORITY_PRODUCT, and ORDER_COMPLETED_SPECIAL_PRODUCT activities
      let orderPoints = 0;
      let specialProductPoints = 0;
      let totalOrderPoints = 0; // Total points from order (normal + special)
      if (
        activityType === ActivityType.ORDER_COMPLETED ||
        activityType === ActivityType.ORDER_COMPLETED_PRIORITY_PRODUCT ||
        activityType === ActivityType.ORDER_COMPLETED_SPECIAL_PRODUCT
      ) {
        // Calculate points based on the specific product type for this activity log
        // Each activity log now represents only one product type, so we use the corresponding total
        // Special products (flag === 'special') earn DOUBLE points (12 points per 1000 VND)
        // Priority products (product.flag === 'priority') earn TRIPLE points (18 points per 1000 VND)
        // Normal products earn standard points (6 points per 1000 VND)

        let amountForPoints = 0;
        let productType: 'regular' | 'special' | 'priority' | 'custom' = 'regular';

        const toNumber = (value: Prisma.JsonValue | undefined): number =>
          typeof value === 'number' ? value : 0;

        if (activityType === ActivityType.ORDER_COMPLETED) {
          // Normal/regular products - use regularProductsTotal (or normalProductsTotal for backward compat)
          amountForPoints =
            toNumber(metadata?.regularProductsTotal) ||
            toNumber(metadata?.normalProductsTotal);
          productType = 'regular';
        } else if (activityType === ActivityType.ORDER_COMPLETED_SPECIAL_PRODUCT) {
          // Special products - use specialProductsTotal, earn double points
          amountForPoints = toNumber(metadata?.specialProductsTotal);
          productType = 'special';
        } else if (activityType === ActivityType.ORDER_COMPLETED_PRIORITY_PRODUCT) {
          // Priority products - use priorityProductsTotal, earn triple points
          amountForPoints = toNumber(metadata?.priorityProductsTotal);
          productType = 'priority';
        }

        if (amountForPoints > 0) {
          orderPoints = this.calculateOrderPoints(amountForPoints, productType);
          totalOrderPoints = orderPoints;

          this.logger.log(
            `📊 [Gamification] Order points calculated - ${activityType}: ${totalOrderPoints} points (${amountForPoints} VND, productType=${productType})`,
          );
        }
      }

      // 2. Process each active task and calculate rewards
      for (const userTask of userTasks) {
        const taskType = userTask.task.type;
        const updatedTask = await this.prisma.userTask.update({
          where: { id: userTask.id },
          data: {
            currentCount: { increment: 1 },
            updatedAt: new Date(),
          },
        });
        const newCount = updatedTask.currentCount;
        const isReadyToComplete = newCount >= userTask.targetCount;

        const pendingUpdate: Prisma.UserTaskUpdateInput = {};

        // Update status and completedAt for non-repeatable tasks
        if (taskType !== TaskType.repeatable) {
          pendingUpdate.status = isReadyToComplete
            ? UserTaskStatus.completed
            : UserTaskStatus.in_progress;
          if (isReadyToComplete) {
            pendingUpdate.completedAt = new Date();
          }
        }

        if (Object.keys(pendingUpdate).length > 0) {
          tasksToUpdate.push({
            id: userTask.id,
            data: pendingUpdate,
          });
        }

        // Award points based on task type
        const shouldAwardPoints =
          ((activityType === ActivityType.ORDER_COMPLETED ||
            activityType === ActivityType.ORDER_COMPLETED_PRIORITY_PRODUCT ||
            activityType === ActivityType.ORDER_COMPLETED_SPECIAL_PRODUCT) &&
            totalOrderPoints > 0) ||
          (userTask.task.pointReward > 0 &&
            (taskType === TaskType.repeatable || // Repeatable: award on each increment
              taskType === TaskType.daily || // Daily: award on each increment
              isReadyToComplete)); // Other types: award only when complete

        // For ORDER_COMPLETED, ORDER_COMPLETED_PRIORITY_PRODUCT, or ORDER_COMPLETED_SPECIAL_PRODUCT, use calculated points instead of task's fixed pointReward
        const pointsToAward =
          (activityType === ActivityType.ORDER_COMPLETED ||
            activityType === ActivityType.ORDER_COMPLETED_PRIORITY_PRODUCT ||
            activityType === ActivityType.ORDER_COMPLETED_SPECIAL_PRODUCT) &&
          totalOrderPoints > 0
            ? totalOrderPoints
            : userTask.task.pointReward;

        if (shouldAwardPoints) {
          totalPointsToAward += pointsToAward;
          totalExperienceToAward += userTask.task.experienceReward;
        }

        // If task is fully completed, auto-claim for daily tasks
        if (isReadyToComplete) {
          completedTasks.push(userTask);

          // Auto-claim daily tasks (they should not require manual claiming)
          if (taskType === TaskType.daily) {
            tasksToUpdate.push({
              id: userTask.id,
              data: {
                status: UserTaskStatus.claimed, // Auto-claim daily tasks
                claimedAt: new Date(),
              },
            });
          }
        }
      }

      // 3. Update all tasks in batch using updateMany where possible for better performance
      if (tasksToUpdate.length > 0) {
        // Group updates by operation type for batch processing
        const updatesByType = new Map<string, UserTaskUpdateEntry[]>();

        tasksToUpdate.forEach(({ id, data }) => {
          // Create a key based on the update structure
          const key = JSON.stringify(Object.keys(data).sort());
          if (!updatesByType.has(key)) {
            updatesByType.set(key, []);
          }
          updatesByType.get(key)!.push({ id, data });
        });

        // Execute updates in parallel batches
        await Promise.all(
          Array.from(updatesByType.values()).map(async (updates) => {
            // Use Promise.all for parallel updates within each batch
            await Promise.all(
              updates.map(({ id, data }) =>
                this.prisma.userTask.update({
                  where: { id },
                  data,
                }),
              ),
            );
          }),
        );
      }

      // 4. Award points and experience immediately (no queue to avoid errors)
      this.logger.log(
        `💰 [Gamification] Point calculation complete - totalPointsToAward: ${totalPointsToAward}, totalExperienceToAward: ${totalExperienceToAward}`,
      );

      if (totalPointsToAward > 0 || totalExperienceToAward > 0) {
        const primaryTask = userTasks.find(
          (userTask) => userTask.task.pointReward > 0,
        );
        const contributingTasks = userTasks.filter(
          (userTask) =>
            (userTask.task.type === TaskType.repeatable &&
              userTask.task.pointReward > 0) ||
            (userTask.task.type === TaskType.daily &&
              userTask.task.pointReward > 0),
        );

        let description = 'Thưởng từ nhiệm vụ';
        if (primaryTask && primaryTask.task) {
          description = `Hoàn thành nhiệm vụ: ${primaryTask.task.title}`;
        } else if (contributingTasks.length > 0) {
          description = `Thưởng từ nhiệm vụ: ${contributingTasks.map((userTask) => userTask.task?.title || 'Unknown').join(', ')}`;
        }

        // Award points immediately (useQueue: false)
        if (totalPointsToAward > 0) {
          // Build complete metadata from activity log
          const orderMetadata = {
            orderId: metadata?.orderId,
            orderCode: metadata?.orderCode,
            totalAmount: metadata?.totalAmount,
            discountAmount: metadata?.discountAmount,
            finalAmount: metadata?.finalAmount,
            normalProductsTotal: metadata?.normalProductsTotal || 0,
            specialProductsTotal: metadata?.specialProductsTotal || 0,
            priorityProductsTotal: metadata?.priorityProductsTotal || 0,
            completedAt: metadata?.completedAt,
          };

          await this.awardPoints(
            userId,
            totalPointsToAward,
            'task_completion',
            primaryTask?.taskId,
            1, // multiplier
            description,
            {
              activityType: activityType,
              adminId: metadata?.adminId,
              taskId: primaryTask?.taskId,
              userTaskId: primaryTask?.id,
              contributingTasks: contributingTasks.map((task) => ({
                userTaskId: task.id,
                taskId: task.taskId,
                title: task.task?.title || 'Unknown',
                code: task.task?.code,
                type: task.task?.type,
              })),
              ...orderMetadata,
            },
            primaryTask?.id, // userTaskId
            activityType,
            false, // useQueue: false - execute immediately
          );
        }

        this.logger.log(
          `✅ [Gamification] Points awarded successfully - user: ${userId}, points: ${totalPointsToAward}, experience: ${totalExperienceToAward}`,
        );
      } else {
        this.logger.warn(
          `⚠️ [Gamification] NO POINTS AWARDED for user ${userId} with activityType ${activityType} - totalPointsToAward: ${totalPointsToAward}, totalExperienceToAward: ${totalExperienceToAward}`,
        );
        this.logger.warn(
          `⚠️ [Gamification] This may be because: 1) Task pointReward is 0, 2) Task is not repeatable/daily and not yet completed, 3) ORDER_COMPLETED with no orderPoints calculated`,
        );
      }

      // Create notifications after operations complete
      if (completedTasks.length > 0 && totalPointsToAward > 0) {
        const taskTitles = completedTasks
          .map((t) => t.task.title)
          .join(', ');
        await this.notificationService.createNotificationWithCounter({
          userId,
          relatedModel: RelatedModel.system,
          relatedModelId: completedTasks[0]?.taskId || '',
          action: NotificationAction.task_points_earned,
          message: `🎉 Bạn đã nhận được ${totalPointsToAward} điểm từ ${completedTasks.length} nhiệm vụ: ${taskTitles}`,
          linkUrl: '',
        });
      }
    } catch (error: unknown) {
      // Log and throw - no retry needed since we're not using transactions
      this.logger.error(
        `Failed to update tasks and award points for user ${userId}:`,
        error instanceof Error ? error.stack : error,
      );
      throw error; // Re-throw to let caller handle
    }
  }

  private async checkCooldownAndLimits(
    userId: string,
    activityType: ActivityType,
  ): Promise<boolean> {
    try {
      // Find tasks that have cooldown requirements for this activity type
      const tasksWithCooldown = await this.prisma.task.findMany({
        where: {
          status: TaskStatus.active,
          requiredActivityTypes: {
            has: activityType,
          },
          cooldownHours: {
            not: null,
            gt: 0,
          },
        },
        select: {
          id: true,
          title: true,
          cooldownHours: true,
          targetCount: true,
        },
      });

      if (tasksWithCooldown.length === 0) {
        // No cooldown requirements for this activity type
        return true;
      }

      const now = new Date();

      // Check each task's cooldown requirements
      for (const task of tasksWithCooldown) {
        const cooldownHours = task.cooldownHours!;

        // Calculate the start of the current hour window
        const currentHourStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          now.getHours(),
          0,
          0,
          0,
        );

        // Count activities in the current hour window
        const activitiesInCurrentHour = await this.prisma.activityLog.count({
          where: {
            uploaderId: userId,
            activityType,
            createdAt: {
              gte: currentHourStart,
              lt: new Date(now.getTime() - 1000), // Exclude logs created in the last second
            },
          },
        });

        // Check if user has exceeded the hourly limit
        if (activitiesInCurrentHour >= task.targetCount) {
          this.logger.debug(
            `User ${userId} exceeded hourly limit for task "${task.title}" (${activitiesInCurrentHour}/${task.targetCount}) - cooldown: ${cooldownHours}h`,
          );
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to check cooldown and limits:`, error);
      return true; // Allow processing if check fails
    }
  }

  private async updateTasksForActivity(userId: string, activityType: string) {
    try {
      // 1. Handle existing active tasks
      const activeTasks = await this.prisma.userTask.findMany({
        where: {
          userId,
          status: { in: ['not_started', 'in_progress'] },
          task: {
            requiredActivityTypes: {
              has: activityType,
            },
          },
        },
        include: {
          task: true,
        },
      });

      for (const task of activeTasks) {
        // Skip repeatable tasks - they are handled separately in handleRepeatableTasks
        if (task.task.type === 'repeatable') {
          continue;
        }

        // Auto-start daily tasks when user performs the activity
        if (task.status === 'not_started' && task.task.type === 'daily') {
          await this.prisma.userTask.update({
            where: { id: task.id },
            data: { status: 'in_progress' },
          });
          this.logger.debug(
            `Auto-started daily task ${task.task.title} for user ${userId}`,
          );
        }

        await this.updateTaskProgress(userId, task.taskId, 1);
      }

      // 2. Handle repeatable tasks - create new UserTask if needed
      await this.handleRepeatableTasks(userId, activityType);
    } catch (error) {
      this.logger.error(`Failed to update tasks for activity:`, error);
    }
  }

  /**
   * Award points for completed tasks based on task pointReward
   * This function checks if any tasks were completed and awards points accordingly
   */
  private async awardPointsForCompletedTasks(
    userId: string,
    activityType: string,
  ) {
    try {
      // Find all active tasks that match this activity type
      const activeTasks = await this.prisma.userTask.findMany({
        where: {
          userId,
          status: { in: ['not_started', 'in_progress'] },
          task: {
            requiredActivityTypes: {
              has: activityType,
            },
          },
        },
        include: {
          task: true,
        },
      });

      for (const userTask of activeTasks) {
        // Check if task is ready to complete (currentCount >= targetCount)
        if (userTask.currentCount >= userTask.targetCount) {
          this.logger.log(
            `Task ${userTask.task.title} is ready to complete for user ${userId} - awarding points`,
          );

          // Award points based on task pointReward (not basePoints)
          if (userTask.task.pointReward > 0) {
            await this.awardPoints(
              userId,
              userTask.task.pointReward,
              'task_completion',
              userTask.task.title,
              1,
              `Task completed: ${userTask.task.title}`,
              undefined, // metadata
              userTask.id, // userTaskId - link to specific user task instance
            );

            this.logger.log(
              `✅ Awarded ${userTask.task.pointReward} points for completing task: ${userTask.task.title}`,
            );
          }

          // Award experience based on task experienceReward
          if (userTask.task.experienceReward > 0) {
            await this.addExperience(userId, userTask.task.experienceReward);

            this.logger.log(
              `✅ Awarded ${userTask.task.experienceReward} XP for completing task: ${userTask.task.title}`,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to award points for completed tasks:`, error);
    }
  }

  /**
   * Awards the fixed point amount for a KYC activity, bypassing the Task/UserTask
   * pipeline entirely.
   *
   * The beneficiary is whoever the activity log targets: the person who completed
   * KYC for SECOND_KYC_COMPLETED, or their direct referrer for the SUBORDINATE_*
   * types. Callers are responsible for not emitting the same activity twice — this
   * method has no idempotency of its own.
   */
  private async awardKycActivityPoints(
    userId: string,
    activityType: string,
    metadata?: Prisma.JsonObject,
  ): Promise<void> {
    const config: Record<
      string,
      { points: number; sourceType: string; description: string }
    > = {
      [ActivityType.SUBORDINATE_KYC_COMPLETED]: {
        points: GamificationService.POINTS_SUBORDINATE_KYC_COMPLETED,
        sourceType: 'subordinate_kyc',
        description: 'Cấp dưới hoàn thành KYC',
      },
      [ActivityType.SECOND_KYC_COMPLETED]: {
        points: GamificationService.POINTS_SECOND_KYC_COMPLETED,
        sourceType: 'kyc_2_completed',
        description: 'Hoàn thành xác thực KYC Bậc 2',
      },
      [ActivityType.SUBORDINATE_SECOND_KYC_COMPLETED]: {
        points: GamificationService.POINTS_SUBORDINATE_SECOND_KYC_COMPLETED,
        sourceType: 'subordinate_kyc_2_completed',
        description: 'Cấp dưới hoàn thành KYC Bậc 2',
      },
    };

    const entry = config[activityType];
    if (!entry) {
      this.logger.warn(
        `⚠️ [Gamification] awardKycActivityPoints called with unsupported activityType ${activityType} — no points awarded`,
      );
      return;
    }

    try {
      await this.awardPoints(
        userId,
        entry.points,
        entry.sourceType,
        userId,
        1,
        `${entry.description} (+${entry.points} điểm)`,
        {
          activityType,
          adminId: metadata?.adminId,
          identityId: metadata?.identityId,
          action: metadata?.action,
          subordinateId: metadata?.subordinateId,
          subordinateName: metadata?.subordinateName,
        },
        undefined,
        activityType,
        false,
      );
      this.logger.log(
        `✅ [Gamification] ${activityType} — awarded ${entry.points} points to ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ [Gamification] Failed to award ${activityType} points to ${userId}:`,
        error,
      );
    }
  }

  private async awardOrderActivityPoints(
    userId: string,
    activityType: string,
    metadata?: Prisma.JsonObject,
  ): Promise<void> {
    try {
      const tasks = await this.prisma.task.findMany({
        where: {
          status: 'active',
          requiredActivityTypes: { has: activityType },
        },
      });

      if (tasks.length === 0) {
        this.logger.warn(
          `⚠️ [Gamification] No active task configured for ${activityType} — awarding points directly (order_completion fallback) for user ${userId}`,
        );
      }

      const toNumber = (value: Prisma.JsonValue | undefined): number =>
        typeof value === 'number' ? value : 0;

      let amountForPoints = 0;
      let productType: 'regular' | 'special' | 'priority' = 'regular';

      if (activityType === ActivityType.ORDER_COMPLETED) {
        amountForPoints =
          toNumber(metadata?.regularProductsTotal) ||
          toNumber(metadata?.normalProductsTotal);
        productType = 'regular';
      } else if (activityType === ActivityType.ORDER_COMPLETED_SPECIAL_PRODUCT) {
        amountForPoints = toNumber(metadata?.specialProductsTotal);
        productType = 'special';
      } else if (activityType === ActivityType.ORDER_COMPLETED_PRIORITY_PRODUCT) {
        amountForPoints = toNumber(metadata?.priorityProductsTotal);
        productType = 'priority';
      }

      if (amountForPoints <= 0) {
        this.logger.warn(
          `⚠️ [Gamification] ${activityType} has no order amount in metadata — no points awarded for user ${userId}`,
        );
        return;
      }

      const points = this.calculateOrderPoints(amountForPoints, productType);
      if (points <= 0) return;

      const task = tasks[0] as (typeof tasks)[0] | undefined;
      const orderCode = String(metadata?.orderCode ?? '');

      this.logger.log(
        `📊 [Gamification] Order points (${task ? 'task-direct' : 'no-task-fallback'}) - ${activityType}: ${points} pts (${amountForPoints} VND, ${productType}) for user ${userId}`,
      );

      await this.awardPoints(
        userId,
        points,
        'task_completion',
        task?.id,
        1,
        `Hoàn thành VAT đơn hàng${orderCode ? ` ${orderCode}` : ''}`,
        {
          activityType,
          taskId: task?.id,
          taskCode: task?.code,
          orderId: metadata?.orderId,
          orderCode: metadata?.orderCode,
          totalAmount: metadata?.totalAmount,
          discountAmount: metadata?.discountAmount,
          finalAmount: metadata?.finalAmount,
          normalProductsTotal: metadata?.normalProductsTotal ?? 0,
          specialProductsTotal: metadata?.specialProductsTotal ?? 0,
          priorityProductsTotal: metadata?.priorityProductsTotal ?? 0,
          completedAt: metadata?.completedAt,
        },
        undefined,
        activityType,
        false,
      );

      this.logger.log(
        `✅ [Gamification] Order points awarded (${task ? 'task-direct' : 'no-task-fallback'}) - user: ${userId}, points: ${points}, activityType: ${activityType}`,
      );

      if (task) {
        await this.notificationService.createNotificationWithCounter({
          userId,
          relatedModel: RelatedModel.system,
          relatedModelId: task.id,
          action: NotificationAction.task_points_earned,
          message: `🎉 Bạn đã nhận được ${points} điểm từ đơn hàng${orderCode ? ` ${orderCode}` : ''}`,
          linkUrl: '',
        });
      }
    } catch (error) {
      this.logger.error(
        `[Gamification] awardOrderActivityPoints failed for user ${userId}, activityType ${activityType}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  private async handleRepeatableTasks(userId: string, activityType: string) {
    try {
      // Find repeatable tasks that match this activity
      const repeatableTasks = await this.prisma.task.findMany({
        where: {
          type: 'repeatable',
          status: 'active',
          isPublic: false, // Only auto-assigned tasks (not visible to users)
          requiredActivityTypes: {
            has: activityType,
          },
        },
      });

      for (const task of repeatableTasks) {
        // Check if user already has an active task for this
        const existingTask = await this.prisma.userTask.findFirst({
          where: {
            userId,
            taskId: task.id,
            status: { in: ['not_started', 'in_progress'] },
          },
        });

        if (!existingTask) {
          // Create new UserTask for repeatable task
          const attemptNumber = await this.getNextAttemptNumber(
            userId,
            task.id,
          );

          const newUserTask = await this.prisma.userTask.create({
            data: {
              userId,
              taskId: task.id,
              status: 'in_progress',
              targetCount: task.targetCount,
              currentCount: 1, // Start with 1 since activity just happened
              attemptNumber,
              startedAt: new Date(),
              metadata: {
                autoCreated: true,
                activityType: activityType,
                createdAt: new Date().toISOString(),
              },
            },
          });

          this.logger.debug(
            `Auto-created repeatable task ${task.title} (attempt #${attemptNumber}) for user ${userId}`,
          );

          // Emit real-time update to user via WebSocket
          this.gamificationGateway.emitTaskUpdatedToUser(userId, newUserTask);

          this.logger.log(
            `Task progress updated for user ${userId}: ${task.id} (1/${task.targetCount})`,
          );

          if (1 >= task.targetCount) {
            this.logger.log(
              `Task ${task.id} is ready to complete for user ${userId} (manual completion required)`,
            );
          }
        } else {
          // Update existing task progress
          await this.updateTaskProgress(userId, task.id, 1);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to handle repeatable tasks:`, error);
    }
  }

  private async getNextAttemptNumber(
    userId: string,
    taskId: string,
  ): Promise<number> {
    const lastTask = await this.prisma.userTask.findFirst({
      where: {
        userId,
        taskId,
      },
      orderBy: { attemptNumber: 'desc' },
    });

    return lastTask ? lastTask.attemptNumber + 1 : 1;
  }

  private async autoCompleteRepeatableTask(userId: string, taskId: string) {
    try {
      const userTask = await this.prisma.userTask.findFirst({
        where: {
          userId,
          taskId,
          status: 'in_progress',
        },
        include: { task: true },
      });

      if (!userTask) return;

      // Mark as completed
      await this.prisma.userTask.update({
        where: { id: userTask.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          currentCount: userTask.targetCount,
        },
      });

      // Auto-claim rewards
      await this.claimTaskReward(userId, userTask.id);

      this.logger.log(
        `Auto-completed and claimed repeatable task ${userTask.task.title} for user ${userId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to auto-complete repeatable task:`, error);
    }
  }

  // Removed getBasePoints method - points are now only awarded through task completion

  private async updateActivityCounts(userId: string) {
    await this.prisma.userActivityStats.upsert({
      where: { userId },
      update: {
        dailyActivities: { increment: 1 },
        weeklyActivities: { increment: 1 },
        monthlyActivities: { increment: 1 },
        yearlyActivities: { increment: 1 },
      },
      create: {
        userId,
        dailyActivities: 1,
        weeklyActivities: 1,
        monthlyActivities: 1,
        yearlyActivities: 1,
      },
    });
  }

  private async updateRelevantStreaks(userId: string, activityType: string) {
    if (activityType === 'USER_LOGGED_IN') {
      await this.updateStreak(userId, StreakType.login);
    } else if (activityType === 'POST_CREATED') {
      await this.updateStreak(userId, StreakType.post);
    }
  }

  private async addExperience(userId: string, experience: number) {
    try {
      const stats = await this.prisma.userActivityStats.findUnique({
        where: { userId },
      });

      if (!stats) return;

      const newExperience = stats.totalExperience + experience;
      const newLevel = await this.calculateLevel(newExperience);

      await this.prisma.userActivityStats.update({
        where: { userId },
        data: {
          totalExperience: newExperience,
        },
      });

      // Check for level up
      if (newLevel > stats.currentLevel) {
        await this.levelUp(userId, newLevel);
      }
    } catch (error) {
      this.logger.error(`Failed to add experience:`, error);
    }
  }

  async getOrCreateUserStats(userId: string) {
    return await this.prisma.userActivityStats.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        totalPoints: 0,
        currentPoints: 0,
        spentPoints: 0,
        totalExperience: 0,
        currentLevel: 1,
        experienceToNext: 100,
      },
    });
  }

  // ==================== TASK COMPLETION STATS ====================

  /**
   * Get task completion stats for main tasks
   * - Active Post: Count and sum actual points from activityPointTransaction
   * - Social Post: Count and sum actual points from activityPointTransaction
   * - Direct Referral: Count and sum actual points from activityPointTransaction (SUBORDINATE_KYC_COMPLETED)
   * - Order Completed: Count and sum actual points from activityPointTransaction (ORDER_COMPLETED, dynamic based on order total)
   * - Event Points: Count and sum actual points from activityPointTransaction (game_perfect_score)
   */
  async getTaskCompletionStats(userId: string) {
    try {
      // Every figure below is derived from activityPointTransaction so that each
      // pair of numbers (count + points) is computed from the same set of rows.
      const [
        activePostCount,
        socialPostCount,
        proPostCount,
        activePostPointsResult,
        socialPostPointsResult,
        proPostPointsResult,
        directReferralCount,
        directReferralPointsResult,
        orderCompletedCount,
        orderCompletedPointsResult,
        specialProductPointsResult,
        priorityProductPointsResult,
        businessPointCount,
        businessPointPointsResult,
        eventPointsCount,
        eventPointsResult,
        subordinateSecondKycCount,
        subordinateSecondKycPointsResult,
        gameEventCount,
        gameEventResult,
        affiliatePurchaseCount,
        affiliatePurchasePointsResult,
      ] = await Promise.all([
        // Active Post: Count by activityType (handles all point values)
        this.prisma.activityPointTransaction.count({
          where: {
            userId,
            activityType: 'ACTIVE_POST_LOGGED',
          },
        }),
        // Social Post: Count by activityType (handles both old 200 and new 500 points)
        this.prisma.activityPointTransaction.count({
          where: {
            userId,
            activityType: 'ADMIN_VERIFIED',
          },
        }),
        // Pro Post: Count by activityType (PRO_POST_LOGGED)
        this.prisma.activityPointTransaction.count({
          where: {
            userId,
            activityType: 'PRO_POST_LOGGED',
          },
        }),
        // Active Post: Sum actual points by activityType
        this.prisma.activityPointTransaction.aggregate({
          where: {
            userId,
            activityType: 'ACTIVE_POST_LOGGED',
          },
          _sum: {
            points: true,
          },
        }),
        // Social Post: Sum actual points by activityType (handles both old 200 and new 500 points)
        this.prisma.activityPointTransaction.aggregate({
          where: {
            userId,
            activityType: 'ADMIN_VERIFIED',
          },
          _sum: {
            points: true,
          },
        }),
        // Pro Post: Sum actual points by activityType (PRO_POST_LOGGED)
        this.prisma.activityPointTransaction.aggregate({
          where: {
            userId,
            activityType: 'PRO_POST_LOGGED',
          },
          _sum: {
            points: true,
          },
        }),
        // Direct Referral: Count by activityType.
        // Reading userTask.currentCount here reported a figure that had drifted
        // from the awards actually granted (observed 8 against 4 real awards),
        // and it left the count and the points beside it derived from unrelated
        // sources. Counting the same rows the points are summed from keeps the
        // two numbers inseparable, and matches how the second-tier row and the
        // bulk stats aggregator already count this activity.
        this.prisma.activityPointTransaction.count({
          where: {
            userId,
            activityType: 'SUBORDINATE_KYC_COMPLETED',
          },
        }),
        // Direct Referral: Sum actual points from SUBORDINATE_KYC_COMPLETED
        this.prisma.activityPointTransaction.aggregate({
          where: {
            userId,
            activityType: 'SUBORDINATE_KYC_COMPLETED',
          },
          _sum: {
            points: true,
          },
        }),
        // Order Completed: Count VAT-completed orders for this user.
        // Source of truth = `OrderVat.status = completed` (NOT `Order.status = completed`).
        // Rationale: VAT completion is the irreversible "đơn đã xong" moment in the
        // ACTA flow — the order is shipped, inventory deducted, points credited,
        // and rollback past this point is extremely rare. The legacy implementation
        // read `UserTask("ORDER_SUCCESS").currentCount` which has no producer in
        // the current code path (`awardOrderActivityPoints` bypasses UserTask),
        // so the counter was permanently stuck at 0.
        this.prisma.order.count({
          where: {
            customer: { userId },
            status: { notIn: ['cancelled', 'draft'] },
            orderVat: { is: { status: 'completed' } },
          },
        }),
        // Order Completed: Sum actual points from ORDER_COMPLETED
        this.prisma.activityPointTransaction.aggregate({
          where: {
            userId,
            activityType: 'ORDER_COMPLETED',
          },
          _sum: {
            points: true,
          },
        }),
        // Special Product: Sum actual points from ORDER_COMPLETED_SPECIAL_PRODUCT.
        // Per-tier ORDER counts come from computeOrderTierStats (distinct orders,
        // so a duplicated award is not double-counted) — not row counts here.
        this.prisma.activityPointTransaction.aggregate({
          where: {
            userId,
            activityType: 'ORDER_COMPLETED_SPECIAL_PRODUCT',
          },
          _sum: {
            points: true,
          },
        }),
        // Priority Product: Sum actual points from ORDER_COMPLETED_PRIORITY_PRODUCT
        this.prisma.activityPointTransaction.aggregate({
          where: {
            userId,
            activityType: 'ORDER_COMPLETED_PRIORITY_PRODUCT',
          },
          _sum: {
            points: true,
          },
        }),
        // Business Point: Count by activityType (BUSINESS_POINT_AWARDED)
        this.prisma.activityPointTransaction.count({
          where: {
            userId,
            activityType: 'BUSINESS_POINT_AWARDED',
          },
        }),
        // Business Point: Sum actual points by activityType (BUSINESS_POINT_AWARDED)
        this.prisma.activityPointTransaction.aggregate({
          where: {
            userId,
            activityType: 'BUSINESS_POINT_AWARDED',
          },
          _sum: {
            points: true,
          },
        }),
        // Event Points: Count by sourceType (game_perfect_score)
        this.prisma.activityPointTransaction.count({
          where: {
            userId,
            sourceType: 'game_perfect_score',
          },
        }),
        // Event Points: Sum actual points by sourceType (game_perfect_score)
        this.prisma.activityPointTransaction.aggregate({
          where: {
            userId,
            sourceType: 'game_perfect_score',
          },
          _sum: {
            points: true,
          },
        }),
        // Subordinate Second KYC: Count by activityType
        this.prisma.activityPointTransaction.count({
          where: {
            userId,
            activityType: 'SUBORDINATE_SECOND_KYC_COMPLETED',
          },
        }),
        // Subordinate Second KYC: Sum actual points
        this.prisma.activityPointTransaction.aggregate({
          where: {
            userId,
            activityType: 'SUBORDINATE_SECOND_KYC_COMPLETED',
          },
          _sum: {
            points: true,
          },
        }),
        // Game Event (Zalo): Count by sourceType (game_event + game_event_referral)
        this.prisma.activityPointTransaction.count({
          where: {
            userId,
            sourceType: { in: ['game_event', 'game_event_referral'] },
          },
        }),
        // Game Event (Zalo): Sum actual points by sourceType (game_event + game_event_referral)
        this.prisma.activityPointTransaction.aggregate({
          where: {
            userId,
            sourceType: { in: ['game_event', 'game_event_referral'] },
          },
          _sum: {
            points: true,
          },
        }),
        // Affiliate-marketing points ("Điểm tiếp thị liên kết"): Count by activityType
        this.prisma.activityPointTransaction.count({
          where: {
            userId,
            activityType: 'AFFILIATE_PURCHASE_POINT_AWARDED',
          },
        }),
        // Affiliate-marketing points: Sum actual points by activityType
        this.prisma.activityPointTransaction.aggregate({
          where: {
            userId,
            activityType: 'AFFILIATE_PURCHASE_POINT_AWARDED',
          },
          _sum: {
            points: true,
          },
        }),
      ]);

      // Extract count values
      // `directReferralCount` is now a direct number from `activityPointTransaction.count`.
      // `orderCompletedCount` is now a direct number from `prisma.order.count`
      // (VAT-completed orders). Kept as a local const for clarity at the return site.

      // Net out duplicate-award reversals so the order-point tiers match the
      // wallet balance. A reversal row (sourceType order_points_reversal) carries
      // a null activityType, so the per-activityType sums above cannot see it; it
      // offsets its OWN order's tiers in proportion to that order's positive
      // awards (a duplicate re-award scales all tiers evenly), never another
      // order's.
      const orderTierStats = await this.computeOrderTierStats(userId);
      const orderReversalAdjustment = orderTierStats.reversal;
      // Distinct orders per tier (a duplicated award counts once, matching the
      // netted points above).
      const normalProductCount = orderTierStats.orderCounts.normal;
      const specialProductCount = orderTierStats.orderCounts.special;
      const priorityProductCount = orderTierStats.orderCounts.priority;

      // Extract actual points earned
      const activePostPoints = activePostPointsResult._sum?.points || 0;
      const socialPostPoints = socialPostPointsResult._sum?.points || 0;
      const proPostPoints = proPostPointsResult._sum?.points || 0;
      const directReferralPoints = directReferralPointsResult._sum?.points || 0;
      const orderCompletedPoints = Math.max(
        0,
        Math.round(
          (orderCompletedPointsResult._sum?.points || 0) + orderReversalAdjustment.normal,
        ),
      );
      const specialProductPoints = Math.max(
        0,
        Math.round(
          (specialProductPointsResult._sum?.points || 0) + orderReversalAdjustment.special,
        ),
      );
      const priorityProductPoints = Math.max(
        0,
        Math.round(
          (priorityProductPointsResult._sum?.points || 0) + orderReversalAdjustment.priority,
        ),
      );
      const businessPointPoints = businessPointPointsResult._sum?.points || 0;
      const eventPoints = eventPointsResult._sum?.points || 0;
      const subordinateSecondKycPoints = subordinateSecondKycPointsResult._sum?.points || 0;
      const gameEventPoints = gameEventResult._sum?.points || 0;
      const affiliatePurchasePoints = affiliatePurchasePointsResult._sum?.points || 0;

      // "Điểm chính" (sharing composite) — order (net reversal, all tiers) + KYC
      // tuyến dưới + tiếp thị liên kết. Uses the shared helper so this figure
      // matches the affiliate portal (/recognized-users/me/recognized-level) and
      // the referral tab exactly, instead of the drifted inline copies that
      // caused the admin/hoahong discrepancy.
      const orderGrossPoints =
        (orderCompletedPointsResult._sum?.points || 0) +
        (specialProductPointsResult._sum?.points || 0) +
        (priorityProductPointsResult._sum?.points || 0);
      const orderReversalPoints =
        orderReversalAdjustment.normal +
        orderReversalAdjustment.special +
        orderReversalAdjustment.priority;
      const sharingCompositePoints = computeSharingComposite({
        orderGrossPoints,
        orderReversalPoints,
        subordinateKycPoints: directReferralPoints,
        affiliatePurchasePoints,
      });

      // Calculate total points from all main tasks
      const totalPoints =
        activePostPoints +
        socialPostPoints +
        proPostPoints +
        directReferralPoints +
        orderCompletedPoints +
        specialProductPoints +
        priorityProductPoints +
        subordinateSecondKycPoints;

      return {
        activePostCount,
        socialPostCount,
        proPostCount,
        directReferralCount,
        orderCompletedCount,
        businessPointCount,
        activePostPoints,
        socialPostPoints,
        proPostPoints,
        directReferralPoints,
        orderCompletedPoints,
        normalProductCount,
        specialProductCount,
        specialProductPoints,
        priorityProductCount,
        priorityProductPoints,
        businessPointPoints,
        eventPointsCount,
        eventPoints,
        subordinateSecondKycCount,
        subordinateSecondKycPoints,
        gameEventCount,
        gameEventPoints,
        affiliatePurchaseCount,
        affiliatePurchasePoints,
        sharingCompositePoints,
        totalPoints,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get task completion stats for user ${userId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Per-tier order stats for a user:
   *  - `reversal`: duplicate-award reversals (sourceType order_points_reversal,
   *    null activityType) attributed to each reversal's own order in proportion
   *    to that order's positive awards — non-positive values to add to the
   *    per-tier point sums so they match the wallet balance.
   *  - `orderCounts`: DISTINCT orders per tier (by metadata.orderId), so an order
   *    that was awarded twice shows as one order, not two. Rows without an
   *    orderId fall back to their own id (counted individually, as before).
   */
  private async computeOrderTierStats(userId: string): Promise<{
    reversal: { normal: number; special: number; priority: number };
    orderCounts: { normal: number; special: number; priority: number };
  }> {
    const reversal = { normal: 0, special: 0, priority: 0 };

    const [positives, reversals] = await Promise.all([
      this.prisma.activityPointTransaction.findMany({
        where: {
          userId,
          points: { gt: 0 },
          activityType: {
            in: [
              ActivityType.ORDER_COMPLETED,
              ActivityType.ORDER_COMPLETED_SPECIAL_PRODUCT,
              ActivityType.ORDER_COMPLETED_PRIORITY_PRODUCT,
            ],
          },
        },
        select: { id: true, points: true, activityType: true, metadata: true },
      }),
      this.prisma.activityPointTransaction.findMany({
        where: { userId, sourceType: 'order_points_reversal' },
        select: { points: true, metadata: true },
      }),
    ]);

    // Positive order points per order (for reversal attribution) + distinct-order
    // sets per tier (for the counts).
    const tierByOrder = new Map<
      string,
      { normal: number; special: number; priority: number }
    >();
    const ordersByTier = {
      normal: new Set<string>(),
      special: new Set<string>(),
      priority: new Set<string>(),
    };
    for (const row of positives) {
      const orderId = this.readOrderIdFromMetadata(row.metadata);
      const countKey = orderId ?? row.id;
      if (row.activityType === ActivityType.ORDER_COMPLETED) ordersByTier.normal.add(countKey);
      else if (row.activityType === ActivityType.ORDER_COMPLETED_SPECIAL_PRODUCT) ordersByTier.special.add(countKey);
      else if (row.activityType === ActivityType.ORDER_COMPLETED_PRIORITY_PRODUCT) ordersByTier.priority.add(countKey);

      if (!orderId) continue; // reversal attribution keys on orderId
      const tiers = tierByOrder.get(orderId) ?? { normal: 0, special: 0, priority: 0 };
      if (row.activityType === ActivityType.ORDER_COMPLETED) tiers.normal += row.points;
      else if (row.activityType === ActivityType.ORDER_COMPLETED_SPECIAL_PRODUCT) tiers.special += row.points;
      else if (row.activityType === ActivityType.ORDER_COMPLETED_PRIORITY_PRODUCT) tiers.priority += row.points;
      tierByOrder.set(orderId, tiers);
    }

    for (const rev of reversals) {
      const orderId = this.readOrderIdFromMetadata(rev.metadata);
      const amount = rev.points; // negative
      if (!orderId || !amount) continue;
      const tiers = tierByOrder.get(orderId);
      if (!tiers) continue;
      const gross = tiers.normal + tiers.special + tiers.priority;
      if (gross <= 0) continue;
      reversal.normal += (amount * tiers.normal) / gross;
      reversal.special += (amount * tiers.special) / gross;
      reversal.priority += (amount * tiers.priority) / gross;
    }

    return {
      reversal,
      orderCounts: {
        normal: ordersByTier.normal.size,
        special: ordersByTier.special.size,
        priority: ordersByTier.priority.size,
      },
    };
  }

  /** Read a string `orderId` off an ActivityPointTransaction.metadata JSON blob. */
  private readOrderIdFromMetadata(metadata: unknown): string | null {
    if (metadata && typeof metadata === 'object' && 'orderId' in metadata) {
      const value = (metadata as Record<string, unknown>).orderId;
      return typeof value === 'string' ? value : null;
    }
    return null;
  }

  // ==================== USER INITIALIZATION ====================

  async initializeUserStats(userId: string) {
    try {
      // Check if stats already exist
      const existingStats = await this.prisma.userActivityStats.findUnique({
        where: { userId },
      });

      if (existingStats) {
        this.logger.log(`User ${userId} already has stats initialized`);
        return existingStats;
      }

      // Create user stats with default values
      const stats = await this.prisma.userActivityStats.create({
        data: {
          userId,
          totalPoints: 0,
          currentPoints: 0,
          spentPoints: 0,
          totalExperience: 0,
          currentLevel: 1,
          experienceToNext: 100,
          dailyPoints: 0,
          weeklyPoints: 0,
          monthlyPoints: 0,
          yearlyPoints: 0,
          dailyActivities: 0,
          weeklyActivities: 0,
          monthlyActivities: 0,
          yearlyActivities: 0,
          tasksCompleted: 0,
          dailyTasksCompleted: 0,
          weeklyTasksCompleted: 0,
          achievementsUnlocked: 0,
          globalRank: null,
          dailyRank: null,
          weeklyRank: null,
          monthlyRank: null,
        },
      });

      // Initialize basic streaks
      await this.initializeUserStreaks(userId);

      // Create user achievement records for all active achievements
      await this.initializeUserAchievements(userId);

      this.logger.log(`User ${userId} stats initialized successfully`);
      return stats;
    } catch (error) {
      this.logger.error(
        `Failed to initialize user stats for ${userId}:`,
        error,
      );
      throw error;
    }
  }

  private async initializeUserStreaks(userId: string) {
    const streakTypes = ['login', 'post', 'order', 'learning'] as StreakType[];

    for (const streakType of streakTypes) {
      await this.prisma.userStreak.create({
        data: {
          userId,
          streakType,
          currentStreak: 0,
          longestStreak: 0,
          isActive: true,
          isBroken: false,
          freezesAvailable: 3, // Give new users 3 free streak freezes
          freezesUsed: 0,
        },
      });
    }
  }

  private async initializeUserAchievements(userId: string) {
    try {
      // Get all active achievements
      const achievements = await this.prisma.achievement.findMany({
        where: { isActive: true },
      });

      // Create user achievement records
      const userAchievements = achievements.map((achievement) => ({
        userId,
        achievementId: achievement.id,
        currentProgress: 0,
        targetProgress: achievement.requiredCount,
        progressPercent: 0,
        isUnlocked: false,
        isPinned: false,
      }));

      if (userAchievements.length > 0) {
        await this.prisma.userAchievement.createMany({
          data: userAchievements,
          skipDuplicates: true,
        });
      }

      this.logger.log(
        `Initialized ${userAchievements.length} achievements for user ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to initialize achievements for user ${userId}:`,
        error,
      );
    }
  }

  async assignBasicTasks(userId: string) {
    try {
      // Get all active tasks to assign to new users
      const activeTasks = await this.prisma.task.findMany({
        where: {
          status: TaskStatus.active,
        },
      });

      for (const task of activeTasks) {
        await this.assignTaskToUser(userId, task.id);
      }

      this.logger.log(
        `Assigned ${activeTasks.length} basic tasks to user ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to assign basic tasks to user ${userId}:`,
        error,
      );
    }
  }

  async assignNewlyCreatedDailyTasks() {
    try {
      // Get daily tasks created in the last hour that haven't been assigned to all users yet
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const newDailyTasks = await this.prisma.task.findMany({
        where: {
          type: 'daily',
          status: 'active',
          isPublic: true,
          createdAt: { gte: oneHourAgo },
        },
      });

      if (newDailyTasks.length === 0) {
        this.logger.debug('No new daily tasks created in the last hour');
        return;
      }

      // Get all active users
      const activeUsers = await this.prisma.user.findMany({
        where: { status: 'active' },
        select: { id: true },
      });

      let totalAssignments = 0;

      for (const task of newDailyTasks) {
        for (const user of activeUsers) {
          try {
            // Check if user already has this task for current period
            const resetDate = this.getResetDate('daily');
            const existingUserTask = await this.prisma.userTask.findFirst({
              where: {
                userId: user.id,
                taskId: task.id,
                createdAt: { gte: resetDate }, // Created after last reset
              },
            });

            if (!existingUserTask) {
              // Assign the new daily task to user
              try {
                await this.assignTaskToUser(user.id, task.id);
                totalAssignments++;
              } catch (error) {
                // Log but don't stop the entire process for individual failures
                this.logger.warn(
                  `Failed to assign new task ${task.id} to user ${user.id}: ${error.message}`,
                );
              }
            }
          } catch (error) {
            this.logger.error(
              `Failed to process user ${user.id} for new task ${task.id}:`,
              error,
            );
          }
        }
      }

      this.logger.log(
        `Assigned ${newDailyTasks.length} new daily tasks to ${activeUsers.length} users (${totalAssignments} total assignments)`,
      );
    } catch (error) {
      this.logger.error('Failed to assign newly created daily tasks:', error);
    }
  }

  async ensureAllUsersHaveDailyTasks() {
    try {
      // Get all active daily tasks for today
      const dailyTasks = await this.prisma.task.findMany({
        where: {
          type: 'daily',
          status: 'active',
          isPublic: true,
          OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
        },
      });

      if (dailyTasks.length === 0) {
        this.logger.debug('No active daily tasks found');
        return;
      }

      // Get all active users
      const activeUsers = await this.prisma.user.findMany({
        where: { status: 'active' },
        select: { id: true },
      });

      let totalAssignments = 0;
      const resetDate = this.getResetDate('daily');

      for (const task of dailyTasks) {
        for (const user of activeUsers) {
          try {
            // Check if user already has this task for current period
            const existingUserTask = await this.prisma.userTask.findFirst({
              where: {
                userId: user.id,
                taskId: task.id,
                createdAt: { gte: resetDate }, // Created after last reset
              },
            });

            // Only assign if user doesn't have the task for current period
            if (!existingUserTask) {
              try {
                await this.assignTaskToUser(user.id, task.id);
                totalAssignments++;
              } catch (error) {
                // Log but don't stop the entire process for individual failures
                this.logger.warn(
                  `Failed to assign daily task ${task.id} to user ${user.id}: ${error.message}`,
                );
              }
            }
          } catch (error) {
            this.logger.error(
              `Failed to process user ${user.id} for task ${task.id}:`,
              error,
            );
          }
        }
      }

      if (totalAssignments > 0) {
        this.logger.log(
          `Ensured daily tasks assigned: ${totalAssignments} assignments made for ${dailyTasks.length} tasks across ${activeUsers.length} users`,
        );
      } else {
        this.logger.debug('All users already have their daily tasks assigned');
      }
    } catch (error) {
      this.logger.error('Failed to ensure all users have daily tasks:', error);
    }
  }

  /**
   * Create all active tasks for a new user
   * This should be called when a user completes email verification
   */
  async createActiveTasksForNewUser(userId: string) {
    try {
      this.logger.log(`🎯 Creating active tasks for new user: ${userId}`);

      // Get all active tasks
      const activeTasks = await this.prisma.task.findMany({
        where: { status: 'active' },
        orderBy: { createdAt: 'asc' },
      });

      if (activeTasks.length === 0) {
        this.logger.log(`No active tasks found for new user ${userId}`);
        return [];
      }

      const createdTasks: Array<Awaited<
        ReturnType<typeof this.prisma.userTask.create>
      >> = [];

      for (const task of activeTasks) {
        try {
          // Check if user already has this task
          const existingTask = await this.prisma.userTask.findFirst({
            where: {
              userId,
              taskId: task.id,
              status: { in: ['not_started', 'in_progress'] },
            },
          });

          if (existingTask) {
            this.logger.debug(
              `Task "${task.title}" already exists for user ${userId}`,
            );
            continue;
          }

          // Create new user task directly (bypass assignTaskToUser logic)
          const userTask = await this.prisma.userTask.create({
            data: {
              userId,
              taskId: task.id,
              status: 'in_progress',
              targetCount: task.targetCount || 1,
              currentCount: 0,
              startedAt: new Date(),
              metadata: {
                autoCreated: true,
                createdForNewUser: true,
                createdAt: new Date().toISOString(),
                taskType: task.type,
                originalTitle: task.title,
              },
            },
          });

          createdTasks.push(userTask);
          this.logger.debug(
            `✅ Created task "${task.title}" for user ${userId}`,
          );
        } catch (error) {
          this.logger.warn(
            `Failed to create task "${task.title}" for user ${userId}: ${error.message}`,
          );
          // Continue with other tasks even if one fails
        }
      }

      this.logger.log(
        `🎉 Successfully created ${createdTasks.length}/${activeTasks.length} tasks for new user ${userId}`,
      );

      return createdTasks;
    } catch (error) {
      this.logger.error(
        `Failed to create active tasks for new user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Assign daily, daily_new, and repeatable tasks to a user
   * This should be called when admin approves KYC via handleAction
   */
  async assignDailyAndRepeatableTasksToUser(userId: string) {
    try {
      this.logger.log(
        `🎯 Assigning daily/daily_new/repeatable tasks to user: ${userId}`,
      );

      // Verify user is active
      const user = await this.prisma.user.findUnique({
        where: { id: userId, status: 'active' },
        select: { id: true, status: true, fullName: true },
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Get daily, daily_new, and repeatable active tasks
      // For repeatable: only get first 2 tasks (same as cron job logic)
      const [dailyTasks, dailyNewTasks, allRepeatableTasks] = await Promise.all(
        [
          this.prisma.task.findMany({
            where: {
              status: 'active',
              type: 'daily',
            },
            orderBy: { createdAt: 'asc' },
            take: 2, // 2 daily tasks (including PRO_POST)
          }),
          this.prisma.task.findMany({
            where: {
              status: 'active',
              type: 'daily_new',
            },
            orderBy: { createdAt: 'asc' },
            take: 1, // Only 1 daily_new task
          }),
          this.prisma.task.findMany({
            where: {
              status: 'active',
              type: 'repeatable',
            },
            orderBy: { createdAt: 'asc' },
            take: 2, // Only 2 repeatable tasks (same as cron job)
          }),
        ],
      );

      // Combine all tasks
      const tasks = [...dailyTasks, ...dailyNewTasks, ...allRepeatableTasks];

      if (tasks.length === 0) {
        this.logger.log(
          `No daily/daily_new/repeatable tasks found for user ${userId}`,
        );
        return [];
      }

      this.logger.log(
        `Found ${dailyTasks.length} daily, ${dailyNewTasks.length} daily_new, ${allRepeatableTasks.length} repeatable tasks to assign to user ${userId}`,
      );

      // Get existing user tasks to avoid duplicates
      const existingUserTasks = await this.prisma.userTask.findMany({
        where: {
          userId,
          status: 'in_progress',
        },
        select: {
          taskId: true,
          task: {
            select: {
              type: true,
            },
          },
        },
      });

      const existingTaskIds = new Set(existingUserTasks.map((t) => t.taskId));
      const existingRepeatableTaskIds = existingUserTasks
        .filter((t) => t.task.type === 'repeatable')
        .map((t) => t.taskId);

      const createdTasks: Array<Awaited<
        ReturnType<typeof this.prisma.userTask.create>
      >> = [];

      // Process daily (2 tasks) and daily_new (1 task)
      for (const task of [...dailyTasks, ...dailyNewTasks]) {
        try {
          let attemptNumber = 1;
          let metadata: Prisma.JsonObject = {
            autoCreated: true,
            createdByAdminApproval: true,
            createdAt: new Date().toISOString(),
            taskType: task.type,
            originalTitle: task.title,
          };

          if (task.type === 'daily_new') {
            const today = new Date();
            const dayNumber = today.getDate();
            const monthNumber = today.getMonth() + 1;
            const yearNumber = today.getFullYear();
            const dateString = `${dayNumber.toString().padStart(2, '0')}/${monthNumber.toString().padStart(2, '0')}/${yearNumber}`;
            const daySpecificTitle = `${task.title} ${dateString}`;

            metadata = {
              ...metadata,
              isDailyNew: true,
              dayNumber: dayNumber,
              monthNumber: monthNumber,
              yearNumber: yearNumber,
              dateString: dateString,
              daySpecificTitle: daySpecificTitle,
            };
            attemptNumber = dayNumber;

            // For daily_new: Check if user already has task with today's attemptNumber
            const existingDailyNewTask = await this.prisma.userTask.findFirst({
              where: {
                userId,
                taskId: task.id,
                attemptNumber: dayNumber,
              },
            });

            if (existingDailyNewTask) {
              this.logger.debug(
                `Task "${task.title}" (daily_new) with attemptNumber ${dayNumber} already exists for user ${userId} today`,
              );
              continue;
            }
          } else {
            // For daily: Check if user already has this task
            if (existingTaskIds.has(task.id)) {
              this.logger.debug(
                `Task "${task.title}" (${task.type}) already exists for user ${userId}`,
              );
              continue;
            }
          }

          // Create new user task
          const userTask = await this.prisma.userTask.create({
            data: {
              userId,
              taskId: task.id,
              status: 'in_progress',
              targetCount: task.targetCount || 1,
              currentCount: 0,
              attemptNumber: attemptNumber,
              startedAt: new Date(),
              metadata,
            },
          });

          createdTasks.push(userTask);
          this.logger.debug(
            `✅ Created task "${task.title}" (${task.type}) for user ${userId}`,
          );
        } catch (error) {
          this.logger.warn(
            `Failed to create task "${task.title}" (${task.type}) for user ${userId}: ${error.message}`,
          );
        }
      }

      // Process repeatable tasks: ensure user has exactly 2 repeatable tasks
      const currentRepeatableCount = existingRepeatableTaskIds.length;
      const needToCreate = 2 - currentRepeatableCount;

      if (needToCreate > 0 && allRepeatableTasks.length > 0) {
        // Filter out repeatable tasks user already has
        const availableRepeatableTasks = allRepeatableTasks.filter(
          (t) => !existingRepeatableTaskIds.includes(t.id),
        );

        // Create up to 'needToCreate' repeatable tasks
        for (
          let i = 0;
          i < needToCreate && i < availableRepeatableTasks.length;
          i++
        ) {
          const task = availableRepeatableTasks[i];
          try {
            const userTask = await this.prisma.userTask.create({
              data: {
                userId,
                taskId: task.id,
                status: 'in_progress',
                targetCount: task.targetCount || 1,
                currentCount: 0,
                attemptNumber: 1,
                startedAt: new Date(),
                metadata: {
                  autoCreated: true,
                  createdByAdminApproval: true,
                  createdAt: new Date().toISOString(),
                  taskType: 'repeatable',
                  originalTitle: task.title,
                },
              },
            });

            createdTasks.push(userTask);
            this.logger.debug(
              `✅ Created repeatable task "${task.title}" for user ${userId}`,
            );
          } catch (error) {
            this.logger.warn(
              `Failed to create repeatable task "${task.title}" for user ${userId}: ${error.message}`,
            );
          }
        }
      } else if (currentRepeatableCount >= 2) {
        this.logger.debug(
          `User ${userId} already has ${currentRepeatableCount} repeatable tasks (sufficient)`,
        );
      }

      this.logger.log(
        `🎉 Successfully assigned ${createdTasks.length}/${tasks.length} tasks (daily/daily_new/repeatable) to user ${userId}`,
      );

      // Verify user has sufficient tasks (1 daily + 1 daily_new + 2 repeatable)
      const finalUserTasks = await this.prisma.userTask.findMany({
        where: {
          userId,
          status: 'in_progress',
        },
        include: {
          task: {
            select: {
              type: true,
            },
          },
        },
      });

      const taskCounts = {
        daily: finalUserTasks.filter((t) => t.task.type === 'daily').length,
        daily_new: finalUserTasks.filter((t) => t.task.type === 'daily_new')
          .length,
        repeatable: finalUserTasks.filter((t) => t.task.type === 'repeatable')
          .length,
        total: finalUserTasks.length,
      };

      this.logger.log(
        `📊 User ${userId} now has: ${taskCounts.daily} daily, ${taskCounts.daily_new} daily_new, ${taskCounts.repeatable} repeatable tasks (total: ${taskCounts.total})`,
      );

      // Check if user has sufficient tasks
      if (
        taskCounts.daily >= 1 &&
        taskCounts.daily_new >= 1 &&
        taskCounts.repeatable >= 2
      ) {
        this.logger.log(
          `✅ User ${userId} has sufficient tasks: 1 daily + 1 daily_new + 2 repeatable`,
        );
      } else {
        this.logger.warn(
          `⚠️ User ${userId} may be missing tasks: expected (1 daily + 1 daily_new + 2 repeatable), actual (${taskCounts.daily} daily + ${taskCounts.daily_new} daily_new + ${taskCounts.repeatable} repeatable)`,
        );
      }

      return createdTasks;
    } catch (error) {
      this.logger.error(
        `Failed to assign daily/repeatable tasks to user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  // ==================== ACTIVITY POINT TRANSACTIONS ====================

  async getActivityPointTransactions(query: {
    findBy?: 'name' | 'referenceId' | 'userId' | 'phone' | 'email';
    search?: string;
    orderBy?: 'createdAt-asc' | 'createdAt-desc';
    page?: number;
    limit?: number;
  }) {
    try {
      const page = query.page || 1;
      const limit = query.limit || 20;
      const skip = (page - 1) * limit;
      const orderBy = query.orderBy || 'createdAt-desc';

      // Build where clause based on search
      const where: Prisma.ActivityPointTransactionWhereInput = {};

      if (query.search) {
        if (query.findBy) {
          // Search by specific field
          switch (query.findBy) {
            case 'name':
              where.user = {
                fullName: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              };
              break;
            case 'referenceId':
              where.user = {
                referenceId: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              };
              break;
            case 'userId':
              where.userId = query.search;
              break;
            case 'phone':
              where.user = {
                phoneNumber: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              };
              break;
            case 'email':
              where.user = {
                email: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              };
              break;
          }
        } else {
          // Search across multiple fields (email, referenceId, fullName)
          where.user = {
            OR: [
              {
                email: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                referenceId: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                fullName: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                phoneNumber: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            ],
          };
        }
      }

      // Build orderBy
      const orderByClause: Prisma.ActivityPointTransactionOrderByWithRelationInput =
        {};
      if (orderBy === 'createdAt-asc') {
        orderByClause.createdAt = 'asc';
      } else {
        orderByClause.createdAt = 'desc';
      }

      // Get transactions with pagination
      const [transactions, total] = await Promise.all([
        this.prisma.activityPointTransaction.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phoneNumber: true,
                referenceId: true,
                avatar: {
                  select: {
                    fileUrl: true,
                  },
                },
              },
            },
            userTask: {
              select: {
                id: true,
                status: true,
                currentCount: true,
                targetCount: true,
                completedAt: true,
                claimedAt: true,
                task: {
                  select: {
                    id: true,
                    title: true,
                    code: true,
                    type: true,
                  },
                },
              },
            },
          },
          orderBy: orderByClause,
          skip,
          take: limit,
        }),
        this.prisma.activityPointTransaction.count({ where }),
      ]);

      // Enrich transactions with task information from userTask relation
      // userTask already includes task info via relation, so we use it directly
      const enrichedTransactions = transactions.map((transaction) => {
        // Get task from userTask relation if available (preferred method)
        let task: {
          id: string;
          title: string;
          code: string;
          type: string;
        } | null = null;
        if (transaction.userTask?.task) {
          task = {
            id: transaction.userTask.task.id,
            title: transaction.userTask.task.title,
            code: transaction.userTask.task.code,
            type: transaction.userTask.task.type,
          };
        }

        // If no task from userTask but has metadata with completedTasks, keep metadata
        let enrichedMetadata = transaction.metadata;
        if (
          !task &&
          transaction.metadata &&
          typeof transaction.metadata === 'object' &&
          'completedTasks' in transaction.metadata
        ) {
          // Metadata already contains task info, just keep it
          enrichedMetadata = transaction.metadata;
        }

        return {
          ...transaction,
          task: task || null,
          metadata: enrichedMetadata,
        };
      });

      const totalPages = Math.ceil(total / limit);

      return {
        data: enrichedTransactions,
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };
    } catch (error) {
      this.logger.error('Failed to get activity point transactions:', error);
      throw error;
    }
  }

  // ==================== SYNC SUBORDINATE KYC POINTS ====================

  /**
   * Sync điểm người giới thiệu trực tiếp dựa trên số người giới thiệu thực tế
   * So sánh currentCount trong UserTask với số người giới thiệu thực tế (referrerId = referenceId, status = active)
   * và cộng điểm còn thiếu vào totalPoint và currentPoint
   */
  async syncSubordinateKycPoints(userId: string): Promise<void> {
    try {
      this.logger.log(
        `🔄 [Sync Subordinate KYC Points] Starting sync for user: ${userId}`,
      );

      // 1. Lấy user và referenceId (chỉ sync cho users có status = 'active')
      const user = await this.prisma.user.findUnique({
        where: { id: userId, status: 'active' },
        select: {
          id: true,
          referenceId: true,
          fullName: true,
        },
      });

      if (!user) {
        this.logger.error(
          `❌ [Sync Subordinate KYC Points] User not found: ${userId}`,
        );
        throw new NotFoundException(`User not found: ${userId}`);
      }

      // 2. Lấy UserTask SUBORDINATE_KYC_COMPLETED và currentCount
      const userTask = await this.prisma.userTask.findFirst({
        where: {
          userId: user.id,
          task: {
            code: 'SUBORDINATE_KYC_COMPLETED',
            status: 'active',
          },
        },
        include: {
          task: true,
        },
      });

      if (!userTask) {
        this.logger.log(
          `ℹ️ [Sync Subordinate KYC Points] User ${user.id} doesn't have SUBORDINATE_KYC_COMPLETED task - skipping`,
        );
        return;
      }

      const currentCount = userTask.currentCount;
      const pointReward = userTask.task.pointReward;

      this.logger.log(
        `📊 [Sync Subordinate KYC Points] Current task state - currentCount: ${currentCount}, pointReward: ${pointReward}`,
      );

      // 3. Đếm số người giới thiệu trực tiếp thực tế (referrerId = referenceId và status = active)
      const actualReferralCount = await this.prisma.user.count({
        where: {
          referrerId: user.referenceId,
          status: 'active',
        },
      });

      this.logger.log(
        `👥 [Sync Subordinate KYC Points] Actual referral count: ${actualReferralCount} (users with referrerId = ${user.referenceId} and status = active)`,
      );

      // 4. Tính tổng điểm có thể có từ số người giới thiệu thực tế
      const totalPossiblePoints = actualReferralCount * pointReward;

      // 5. Lấy totalPoint và currentPoint hiện tại của user
      const userStats = await this.prisma.userActivityStats.findUnique({
        where: { userId: user.id },
        select: {
          totalPoints: true,
          currentPoints: true,
        },
      });

      if (!userStats) {
        this.logger.error(
          `❌ [Sync Subordinate KYC Points] UserStats not found for user: ${userId}`,
        );
        throw new NotFoundException(`UserStats not found for user: ${userId}`);
      }

      const currentTotalPoints = userStats.totalPoints;
      const currentPoints = userStats.currentPoints;

      this.logger.log(
        `💰 [Sync Subordinate KYC Points] Current points - totalPoints: ${currentTotalPoints}, currentPoints: ${currentPoints}`,
      );
      this.logger.log(
        `📈 [Sync Subordinate KYC Points] Total possible points from referrals: ${totalPossiblePoints}`,
      );

      // 6. Kiểm tra xem tổng điểm có thể có có >= totalPoint hiện tại không
      if (totalPossiblePoints >= currentTotalPoints) {
        // Tính số điểm còn thiếu = (số người giới thiệu thực tế - currentCount) * pointReward
        const missingCount = actualReferralCount - currentCount;
        const missingPoints = missingCount * pointReward;

        this.logger.log(
          `🔍 [Sync Subordinate KYC Points] Missing count: ${missingCount}, Missing points: ${missingPoints}`,
        );

        if (missingCount > 0 && missingPoints > 0) {
          // Cộng điểm còn thiếu vào totalPoint và currentPoint
          await this.prisma.$transaction(async (tx) => {
            // Update UserActivityStats
            await tx.userActivityStats.update({
              where: { userId: user.id },
              data: {
                totalPoints: { increment: missingPoints },
                currentPoints: { increment: missingPoints },
              },
            });

            // Update currentCount trong UserTask
            await tx.userTask.update({
              where: { id: userTask.id },
              data: {
                currentCount: actualReferralCount,
              },
            });

            // Tạo PointTransaction để log điểm được cộng
            await tx.activityPointTransaction.create({
              data: {
                userId: user.id,
                type: 'earn',
                points: missingPoints,
                balance: currentPoints + missingPoints,
                multiplier: 1,
                sourceType: 'task_sync',
                sourceName: `Sync điểm người giới thiệu trực tiếp (${missingCount} người)`,
                description: `Đồng bộ điểm từ ${currentCount} → ${actualReferralCount} người giới thiệu trực tiếp`,
                taskId: userTask.taskId,
                userTaskId: userTask.id,
                metadata: {
                  syncType: 'subordinate_kyc_points',
                  previousCount: currentCount,
                  newCount: actualReferralCount,
                  missingCount: missingCount,
                  pointReward: pointReward,
                  totalPointsAdded: missingPoints,
                },
              },
            });
          });

          this.logger.log(
            `✅ [Sync Subordinate KYC Points] Successfully synced points for user ${user.id} (${user.fullName}): +${missingPoints} points (${currentCount} → ${actualReferralCount} referrals)`,
          );
        } else {
          this.logger.log(
            `ℹ️ [Sync Subordinate KYC Points] No missing points to sync (missingCount: ${missingCount}, missingPoints: ${missingPoints})`,
          );
        }
      } else {
        this.logger.log(
          `ℹ️ [Sync Subordinate KYC Points] Total possible points (${totalPossiblePoints}) < current totalPoints (${currentTotalPoints}) - user may have earned points from other sources`,
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ [Sync Subordinate KYC Points] Failed to sync points for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Sync điểm người giới thiệu trực tiếp cho tất cả users có task SUBORDINATE_KYC_COMPLETED
   */
  async syncAllSubordinateKycPoints(): Promise<{
    total: number;
    synced: number;
    errors: number;
  }> {
    try {
      this.logger.log(
        `🔄 [Sync All Subordinate KYC Points] Starting sync for all users...`,
      );

      // Lấy tất cả users có task SUBORDINATE_KYC_COMPLETED và status = 'active'
      const userTasks = await this.prisma.userTask.findMany({
        where: {
          task: {
            code: 'SUBORDINATE_KYC_COMPLETED',
            status: 'active',
          },
          user: {
            status: 'active', // Chỉ lấy users có status = 'active'
          },
        },
        select: {
          userId: true,
        },
        distinct: ['userId'],
      });

      const userIds = userTasks.map((ut) => ut.userId);
      const total = userIds.length;

      this.logger.log(
        `📊 [Sync All Subordinate KYC Points] Found ${total} users with SUBORDINATE_KYC_COMPLETED task`,
      );

      let synced = 0;
      let errors = 0;

      // Sync từng user
      for (const userId of userIds) {
        try {
          await this.syncSubordinateKycPoints(userId);
          synced++;
        } catch (error) {
          errors++;
          this.logger.error(
            `❌ [Sync All Subordinate KYC Points] Failed to sync user ${userId}:`,
            error,
          );
        }
      }

      this.logger.log(
        `✅ [Sync All Subordinate KYC Points] Completed: ${synced}/${total} users synced, ${errors} errors`,
      );

      return {
        total,
        synced,
        errors,
      };
    } catch (error) {
      this.logger.error(
        `❌ [Sync All Subordinate KYC Points] Failed to sync all users:`,
        error,
      );
      throw error;
    }
  }

  // ==================== LEVEL CAP EXTENSION ====================

  /**
   * Check for active users approaching level cap and extend levels if needed
   * Uses polynomial progression formula: XP Range = baseRange + (level - baseLevel) * increment
   * This is a famous formula used in many RPG games for level progression
   */
  async checkAndExtendLevelCap(): Promise<{
    extended: boolean;
    newMaxLevel: number;
    usersNearCap: number;
    levelsAdded: number;
  }> {
    try {
      this.logger.log(
        '🔄 [Level Cap Extension] Checking for users near level cap...',
      );

      // 1. Get current maximum level
      const maxLevelConfig = await this.prisma.levelConfiguration.findFirst({
        orderBy: { level: 'desc' },
      });

      if (!maxLevelConfig) {
        this.logger.warn('No level configurations found');
        return {
          extended: false,
          newMaxLevel: 0,
          usersNearCap: 0,
          levelsAdded: 0,
        };
      }

      const currentMaxLevel = maxLevelConfig.level;
      const threshold = 3; // Consider users within 3 levels of cap as "almost reaching"

      // 2. Find active users who are close to the level cap
      const usersNearCap = await this.prisma.userActivityStats.count({
        where: {
          user: {
            status: 'active',
          },
          currentLevel: {
            gte: currentMaxLevel - threshold,
          },
        },
      });

      this.logger.log(
        `📊 [Level Cap Extension] Current max level: ${currentMaxLevel}, Users near cap (within ${threshold} levels): ${usersNearCap}`,
      );

      // 3. If there are users approaching the cap, extend by 5 levels
      if (usersNearCap > 0) {
        const levelsToAdd = 5;
        const newMaxLevel = currentMaxLevel + levelsToAdd;

        this.logger.log(
          `🔧 [Level Cap Extension] Extending level cap from ${currentMaxLevel} to ${newMaxLevel} (adding ${levelsToAdd} levels)`,
        );

        await this.extendLevels(currentMaxLevel, levelsToAdd);

        this.logger.log(
          `✅ [Level Cap Extension] Successfully extended level cap to ${newMaxLevel}`,
        );

        return {
          extended: true,
          newMaxLevel,
          usersNearCap,
          levelsAdded: levelsToAdd,
        };
      }

      this.logger.log(
        `ℹ️ [Level Cap Extension] No users near cap, no extension needed`,
      );

      return {
        extended: false,
        newMaxLevel: currentMaxLevel,
        usersNearCap,
        levelsAdded: 0,
      };
    } catch (error) {
      this.logger.error(
        '❌ [Level Cap Extension] Failed to check and extend level cap:',
        error,
      );
      throw error;
    }
  }

  /**
   * Extend levels using polynomial progression formula
   * Formula: XP Range = baseRange + (level - baseLevel) * increment
   * This creates a smooth, predictable progression that scales well
   */
  private async extendLevels(
    startLevel: number,
    levelsToAdd: number,
  ): Promise<void> {
    try {
      // Get the last level configuration to continue from
      const lastLevel = await this.prisma.levelConfiguration.findUnique({
        where: { level: startLevel },
      });

      if (!lastLevel) {
        throw new Error(`Level ${startLevel} not found`);
      }

      // Calculate base values for polynomial progression
      // For levels 26+, the pattern is: range = 5000 + (level - 26) * 500
      // We'll continue this pattern for new levels
      const baseLevel = 26;
      const baseRange = 5000;
      const increment = 500;

      // Generate new level configurations
      const newLevels: Prisma.LevelConfigurationCreateInput[] = [];
      let currentExperienceFrom = lastLevel.experienceTo;

      for (let i = 1; i <= levelsToAdd; i++) {
        const newLevel = startLevel + i;
        const levelOffset = newLevel - baseLevel;

        // Calculate XP range using polynomial formula
        const xpRange = baseRange + levelOffset * increment;

        // Ensure minimum range of 5000
        const finalXpRange = Math.max(xpRange, 5000);

        const experienceTo = currentExperienceFrom + finalXpRange;

        // Calculate point reward (increases with level)
        // Pattern: 6000 for level 30, then +500 per level
        const pointReward = 6000 + (newLevel - 30) * 500;

        // Generate display name and icon based on level tier
        const { displayName, icon, color } = this.getLevelDisplayInfo(newLevel);

        newLevels.push({
          level: newLevel,
          experienceFrom: currentExperienceFrom,
          experienceTo: experienceTo,
          pointReward: pointReward,
          displayName: displayName,
          icon: icon,
          color: color,
          unlocksFeatures:
            newLevel % 5 === 0 ? ['premium-features', 'exclusive-access'] : [],
        });

        currentExperienceFrom = experienceTo;
      }

      // Create all new levels in a transaction
      await this.prisma.$transaction(
        newLevels.map((levelConfig) =>
          this.prisma.levelConfiguration.create({
            data: levelConfig,
          }),
        ),
      );

      this.logger.log(
        `✅ [Extend Levels] Created ${newLevels.length} new levels (${startLevel + 1} to ${startLevel + levelsToAdd})`,
      );
    } catch (error) {
      this.logger.error(`Failed to extend levels:`, error);
      throw error;
    }
  }

  /**
   * Get display information for a level based on 5-level grouping with slight variations
   */
  private getLevelDisplayInfo(level: number): {
    displayName: string;
    icon: string;
    color: string;
  } {
    // For levels 1-30, these are handled in seed file
    // This method handles levels 31+
    const group = Math.floor((level - 31) / 5);
    const positionInGroup = ((level - 31) % 5) + 1;

    // Base names for each 5-level group starting from level 31
    const baseNames = [
      'Đối Tác Đặc Quyền', // Levels 31-35
      'Đối Tác Tối Thượng', // Levels 36-40
      'Đối Tác Master', // Levels 41-45
      'Đối Tác Executive', // Levels 46-50
      'Đối Tác Platinum', // Levels 51-55
      'Đối Tác Diamond', // Levels 56-60
    ];

    // Colors for each 5-level group
    const colors = [
      '#E91E63', // Levels 31-35
      '#00BCD4', // Levels 36-40
      '#FFEB3B', // Levels 41-45
      '#FFC107', // Levels 46-50
      '#FF5722', // Levels 51-55
      '#F44336', // Levels 56-60
    ];

    // Get base name and color for this group
    const baseName =
      baseNames[group] || `Đối Tác Cấp ${Math.floor(level / 5) * 5 + 1}`;
    const color = colors[group] || '#FF9800';

    // Icons based on position in group (1-4 stars, then progression icon)
    let icon: string;
    if (positionInGroup === 1) {
      icon = '⭐'; // 1 star
    } else if (positionInGroup === 2) {
      icon = '⭐⭐'; // 2 stars
    } else if (positionInGroup === 3) {
      icon = '⭐⭐⭐'; // 3 stars
    } else if (positionInGroup === 4) {
      icon = '⭐⭐⭐⭐'; // 4 stars
    } else {
      // positionInGroup === 5 - Different icon to show progression
      icon = '🌟'; // Glowing star to indicate next tier
    }

    // Add slight variation based on position in group (1-5)
    let displayName: string;
    if (positionInGroup === 1) {
      displayName = baseName;
    } else if (positionInGroup === 2) {
      displayName = `${baseName} (Cấp ${level})`;
    } else if (positionInGroup === 3) {
      displayName = `${baseName} - Cấp ${level}`;
    } else if (positionInGroup === 4) {
      displayName = `${baseName} ${level}`;
    } else {
      // positionInGroup === 5
      displayName = `${baseName} - Nâng Cấp`;
    }

    return {
      displayName,
      icon,
      color,
    };
  }
}
