import { makeAutoObservable, runInAction } from 'mobx';
import type RootStore from './rootStore';

export interface ActivityLog {
  id: string;
  targetId: string;
  targetType: 'USER' | 'POST' | 'DOCUMENT' | 'NEWS' | 'COMMENT' | 'SYSTEM';
  activityType: string;
  uploaderId: string;
  description: string;
  changes: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  uploader: {
    id: string;
    fullName: string;
    email: string;
    avatar?: {
      id: string;
      fileName: string;
      mimeType: string;
      originalFileName: string;
      fileUrl: string;
      createdAt: string;
      updatedAt: string;
      deletedAt: string | null;
      productId: string | null;
      oldAvatarUserId: string | null;
      oldCoverUserId: string | null;
      documentId: string | null;
    };
    role: 'admin' | 'user' | 'moderator';
    status: 'active' | 'pending' | 'inactive';
  };
}

export interface ActivityStats {
  totalActivities: number;
  activeUsers: number;
  criticalEvents: number;
  todayActivities: number;
}

export interface ActivityLogsFilters {
  search?: string;
  activityType?: string;
  targetType?: string;
  uploaderId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ActivityLogsPagination {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
}

class ActivityLogsStore {
  rootStore: RootStore;
  logs: ActivityLog[] = [];
  stats: ActivityStats = {
    totalActivities: 100,
    activeUsers: 5,
    criticalEvents: 0,
    todayActivities: 7,
  };
  isLoading = false;
  isStatsLoading = false;
  filters: ActivityLogsFilters = {};
  pagination: ActivityLogsPagination = {
    page: 1,
    totalPages: 1,
    total: 0,
    limit: 20,
  };

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
    makeAutoObservable(this);
  }

  async init() {
    await Promise.all([this.loadLogs(), this.loadStats()]);
  }

  async loadLogs() {
    this.isLoading = true;
    try {
      const mockResponse = await this.mockApiCall();

      runInAction(() => {
        this.logs = mockResponse.data;
        this.pagination = {
          page: mockResponse.page,
          totalPages: mockResponse.totalPages,
          total: mockResponse.total,
          limit: 20,
        };
        this.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.isLoading = false;
      });
      console.error('Failed to load activity logs:', error);
    }
  }

  async loadStats() {
    this.isStatsLoading = true;
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats = {
        totalActivities: 1299,
        activeUsers: 5,
        criticalEvents: 0,
        todayActivities: 7,
      };

      runInAction(() => {
        this.stats = stats;
        this.isStatsLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.isStatsLoading = false;
      });
      console.error('Failed to load stats:', error);
    }
  }

  updateFilters = (newFilters: ActivityLogsFilters) => {
    this.filters = { ...newFilters };
    this.pagination.page = 1;
    this.loadLogs();
  };

  updatePagination = (page: number) => {
    this.pagination.page = page;
    this.loadLogs();
  };

  refreshLogs = () => {
    this.loadLogs();
    this.loadStats();
  };

  clearFilters = () => {
    this.filters = {};
    this.pagination.page = 1;
    this.loadLogs();
  };

  private async mockApiCall() {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const mockData: ActivityLog[] = [
      {
        id: 'cmcx5booo0001kz4b8i351qs8',
        targetId: '41fe4f8a-5622-4358-93c9-e94cd69187e5',
        targetType: 'USER',
        activityType: 'USER_LOGGED_IN',
        uploaderId: '41fe4f8a-5622-4358-93c9-e94cd69187e5',
        description: 'User Tô Huy Thông logged in',
        changes: {
          loggedInUser: {
            id: '41fe4f8a-5622-4358-93c9-e94cd69187e5',
            email: 'thongprofessor@gmail.com',
            gender: 'male',
            country: 'VN',
            updatedAt: '2025-07-10T08:37:50.275Z',
            phoneNumber: '0928988988',
            referenceId: 'vn-11000',
          },
        },
        createdAt: '2025-07-10T08:48:45.239Z',
        updatedAt: '2025-07-10T08:48:45.239Z',
        uploader: {
          id: '41fe4f8a-5622-4358-93c9-e94cd69187e5',
          fullName: 'Tô Huy Thông',
          email: 'thongprofessor@gmail.com',
          avatar: {
            id: '15272d12-71b1-4d48-aec0-afeadd8e05f5',
            fileName: 'avatar_11000_1750839774592.jpg',
            mimeType: 'image',
            originalFileName: 'sknt66vmpgpzthz9sm1sjpg',
            fileUrl:
              'https://res.cloudinary.com/dxwtk3y7p/image/upload/v1751076214/acta-e-commerce/sknt66vmpgpzthz9sm1s.jpg',
            createdAt: '2025-06-25T08:22:54.594Z',
            updatedAt: '2025-06-28T02:03:34.613Z',
            deletedAt: null,
            productId: null,
            oldAvatarUserId: null,
            oldCoverUserId: null,
            documentId: null,
          },
          role: 'admin',
          status: 'active',
        },
      },
      {
        id: 'cmcx4wcjh0001kpro50gihiq6',
        targetId: '5c069662-eb39-4d33-95e9-f9f67579f101',
        targetType: 'USER',
        activityType: 'USER_LOGGED_IN',
        uploaderId: '5c069662-eb39-4d33-95e9-f9f67579f101',
        description: 'User Huỳnh Tiến Vĩ logged in',
        changes: {
          loggedInUser: {
            id: '5c069662-eb39-4d33-95e9-f9f67579f101',
            email: 'viht61220@gmail.com',
            gender: 'male',
            country: 'VN',
            updatedAt: '2025-07-07T06:27:27.537Z',
            phoneNumber: '0898616934',
            referenceId: 'vn-11002',
          },
        },
        createdAt: '2025-07-10T08:36:49.661Z',
        updatedAt: '2025-07-10T08:36:49.661Z',
        uploader: {
          id: '5c069662-eb39-4d33-95e9-f9f67579f101',
          fullName: 'Huỳnh Tiến Vĩ',
          email: 'viht61220@gmail.com',
          avatar: {
            id: '58d7ec47-504b-4417-86e2-c1818c6a1ae0',
            fileName: 'avatar_1751869647358.jpg',
            mimeType: 'image',
            originalFileName:
              'z6736107149081_7df219644be2686af1afca3f576c541d.jpg',
            fileUrl:
              'https://2evl34cah0.ufs.sh/f/a6wlsorGVg4vjhJoXwCxck5IB2JQSuU8M4TFsrR0DaoflPAm',
            createdAt: '2025-07-07T06:27:27.359Z',
            updatedAt: '2025-07-07T06:27:27.359Z',
            deletedAt: null,
            productId: null,
            oldAvatarUserId: null,
            oldCoverUserId: null,
            documentId: null,
          },
          role: 'admin',
          status: 'active',
        },
      },
      {
        id: 'cmcx08jcz0001kznjdab0l9u9',
        targetId: '41fe4f8a-5622-4358-93c9-e94cd69187e5',
        targetType: 'USER',
        activityType: 'USER_LOGGED_IN',
        uploaderId: '41fe4f8a-5622-4358-93c9-e94cd69187e5',
        description: 'User Tô Huy Thông logged in',
        changes: {
          loggedInUser: {
            id: '41fe4f8a-5622-4358-93c9-e94cd69187e5',
            email: 'thongprofessor@gmail.com',
            gender: 'male',
            country: 'VN',
            updatedAt: '2025-06-29T04:43:23.015Z',
            phoneNumber: '0928988988',
            referenceId: 'vn-11000',
          },
        },
        createdAt: '2025-07-10T06:26:20.290Z',
        updatedAt: '2025-07-10T06:26:20.290Z',
        uploader: {
          id: '41fe4f8a-5622-4358-93c9-e94cd69187e5',
          fullName: 'Tô Huy Thông',
          email: 'thongprofessor@gmail.com',
          avatar: {
            id: '15272d12-71b1-4d48-aec0-afeadd8e05f5',
            fileName: 'avatar_11000_1750839774592.jpg',
            mimeType: 'image',
            originalFileName: 'sknt66vmpgpzthz9sm1sjpg',
            fileUrl:
              'https://res.cloudinary.com/dxwtk3y7p/image/upload/v1751076214/acta-e-commerce/sknt66vmpgpzthz9sm1s.jpg',
            createdAt: '2025-06-25T08:22:54.594Z',
            updatedAt: '2025-06-28T02:03:34.613Z',
            deletedAt: null,
            productId: null,
            oldAvatarUserId: null,
            oldCoverUserId: null,
            documentId: null,
          },
          role: 'admin',
          status: 'active',
        },
      },
      {
        id: 'cmcwywd8o0001kzu6fwjegdmn',
        targetId: '12224606-e625-4a37-bbad-033ad7c551b9',
        targetType: 'USER',
        activityType: 'USER_LOGGED_IN',
        uploaderId: '12224606-e625-4a37-bbad-033ad7c551b9',
        description: 'User Phùng Quang Long logged in',
        changes: {
          loggedInUser: {
            id: '12224606-e625-4a37-bbad-033ad7c551b9',
            email: 'gabayan170@gmail.com',
            gender: 'male',
            country: 'VN',
            updatedAt: '2025-07-09T11:07:07.218Z',
            phoneNumber: '0763615414',
            referenceId: 'vn-11001',
          },
        },
        createdAt: '2025-07-10T05:48:52.871Z',
        updatedAt: '2025-07-10T05:48:52.871Z',
        uploader: {
          id: '12224606-e625-4a37-bbad-033ad7c551b9',
          fullName: 'Phùng Quang Long',
          email: 'gabayan170@gmail.com',
          avatar: {
            id: 'e7530653-224d-4e3d-9fb8-fc490a209292',
            fileName: 'avatar_1751869644544.jpg',
            mimeType: 'image',
            originalFileName:
              '480568754_2135750906895277_2111366402457174793_n.jpg',
            fileUrl:
              'https://2evl34cah0.ufs.sh/f/a6wlsorGVg4vnhjWC1jXQzrHDFOtlg6oqap74vLidesyKPk1',
            createdAt: '2025-07-07T06:27:24.545Z',
            updatedAt: '2025-07-07T06:27:24.545Z',
            deletedAt: null,
            productId: null,
            oldAvatarUserId: null,
            oldCoverUserId: null,
            documentId: null,
          },
          role: 'admin',
          status: 'active',
        },
      },
      {
        id: 'cmcwtg7ix0001kzik7hgqeccd',
        targetId: '12224606-e625-4a37-bbad-033ad7c551b9',
        targetType: 'USER',
        activityType: 'USER_LOGGED_IN',
        uploaderId: '12224606-e625-4a37-bbad-033ad7c551b9',
        description: 'User Phùng Quang Long logged in',
        changes: {
          loggedInUser: {
            id: '12224606-e625-4a37-bbad-033ad7c551b9',
            email: 'gabayan170@gmail.com',
            gender: 'male',
            country: 'VN',
            updatedAt: '2025-07-09T11:07:07.218Z',
            phoneNumber: '0763615414',
            referenceId: 'vn-11001',
          },
        },
        createdAt: '2025-07-10T03:16:20.889Z',
        updatedAt: '2025-07-10T03:16:20.889Z',
        uploader: {
          id: '12224606-e625-4a37-bbad-033ad7c551b9',
          fullName: 'Phùng Quang Long',
          email: 'gabayan170@gmail.com',
          avatar: {
            id: 'e7530653-224d-4e3d-9fb8-fc490a209292',
            fileName: 'avatar_1751869644544.jpg',
            mimeType: 'image',
            originalFileName:
              '480568754_2135750906895277_2111366402457174793_n.jpg',
            fileUrl:
              'https://2evl34cah0.ufs.sh/f/a6wlsorGVg4vnhjWC1jXQzrHDFOtlg6oqap74vLidesyKPk1',
            createdAt: '2025-07-07T06:27:24.545Z',
            updatedAt: '2025-07-07T06:27:24.545Z',
            deletedAt: null,
            productId: null,
            oldAvatarUserId: null,
            oldCoverUserId: null,
            documentId: null,
          },
          role: 'admin',
          status: 'active',
        },
      },
      {
        id: 'cmcvytgkv0027p801hfcjmr01',
        targetId: 'c32c122f-0ecd-4591-94df-c8f1d53f6b2d',
        targetType: 'USER',
        activityType: 'USER_LOGGED_IN',
        uploaderId: 'c32c122f-0ecd-4591-94df-c8f1d53f6b2d',
        description: 'User Mai Vy logged in',
        changes: {
          loggedInUser: {
            id: 'c32c122f-0ecd-4591-94df-c8f1d53f6b2d',
            email: 'nguyenmaituongvy1105@gmail.com',
            gender: 'female',
            country: 'VN',
            updatedAt: '2025-07-09T12:58:25.982Z',
            phoneNumber: '0986810759',
            referenceId: 'vn-11085',
          },
        },
        createdAt: '2025-07-09T12:58:51.055Z',
        updatedAt: '2025-07-09T12:58:51.055Z',
        uploader: {
          id: 'c32c122f-0ecd-4591-94df-c8f1d53f6b2d',
          fullName: 'Mai Vy',
          email: 'nguyenmaituongvy1105@gmail.com',
          avatar: {
            id: 'f6a381c0-b162-4755-aa8c-cb9edc9ab75d',
            fileName: 'avatar_1752065877283.jpg',
            mimeType: 'image',
            originalFileName: 'avatar.jpg',
            fileUrl: 'https://i.pravatar.cc/150?img=58',
            createdAt: '2025-07-09T12:57:57.285Z',
            updatedAt: '2025-07-09T12:57:57.285Z',
            deletedAt: null,
            productId: null,
            oldAvatarUserId: null,
            oldCoverUserId: null,
            documentId: null,
          },
          role: 'user',
          status: 'pending',
        },
      },
      {
        id: 'cmcvyszmb0025p801pfyv5152',
        targetId: 'c32c122f-0ecd-4591-94df-c8f1d53f6b2d',
        targetType: 'USER',
        activityType: 'USER_EMAIL_VERIFIED',
        uploaderId: 'c32c122f-0ecd-4591-94df-c8f1d53f6b2d',
        description: 'User Mai Vy verified email',
        changes: {
          verifiedUser: {
            id: 'c32c122f-0ecd-4591-94df-c8f1d53f6b2d',
            email: 'nguyenmaituongvy1105@gmail.com',
            gender: 'female',
            country: 'VN',
            updatedAt: '2025-07-09T12:58:25.982Z',
            phoneNumber: '0986810759',
            referenceId: 'vn-11085',
          },
        },
        createdAt: '2025-07-09T12:58:29.075Z',
        updatedAt: '2025-07-09T12:58:29.075Z',
        uploader: {
          id: 'c32c122f-0ecd-4591-94df-c8f1d53f6b2d',
          fullName: 'Mai Vy',
          email: 'nguyenmaituongvy1105@gmail.com',
          avatar: {
            id: 'f6a381c0-b162-4755-aa8c-cb9edc9ab75d',
            fileName: 'avatar_1752065877283.jpg',
            mimeType: 'image',
            originalFileName: 'avatar.jpg',
            fileUrl: 'https://i.pravatar.cc/150?img=58',
            createdAt: '2025-07-09T12:57:57.285Z',
            updatedAt: '2025-07-09T12:57:57.285Z',
            deletedAt: null,
            productId: null,
            oldAvatarUserId: null,
            oldCoverUserId: null,
            documentId: null,
          },
          role: 'user',
          status: 'pending',
        },
      },
      {
        id: 'cmcvysdc40023p80199cjbh1t',
        targetId: 'c32c122f-0ecd-4591-94df-c8f1d53f6b2d',
        targetType: 'USER',
        activityType: 'USER_REGISTERED',
        uploaderId: 'c32c122f-0ecd-4591-94df-c8f1d53f6b2d',
        description: 'User Mai Vy registered',
        changes: {
          newUser: {
            id: 'c32c122f-0ecd-4591-94df-c8f1d53f6b2d',
            email: 'nguyenmaituongvy1105@gmail.com',
            gender: 'female',
            country: 'VN',
            updatedAt: '2025-07-09T12:57:57.340Z',
            phoneNumber: '0986810759',
            referenceId: 'vn-11085',
          },
        },
        createdAt: '2025-07-09T12:58:00.197Z',
        updatedAt: '2025-07-09T12:58:00.197Z',
        uploader: {
          id: 'c32c122f-0ecd-4591-94df-c8f1d53f6b2d',
          fullName: 'Mai Vy',
          email: 'nguyenmaituongvy1105@gmail.com',
          avatar: {
            id: 'f6a381c0-b162-4755-aa8c-cb9edc9ab75d',
            fileName: 'avatar_1752065877283.jpg',
            mimeType: 'image',
            originalFileName: 'avatar.jpg',
            fileUrl: 'https://i.pravatar.cc/150?img=58',
            createdAt: '2025-07-09T12:57:57.285Z',
            updatedAt: '2025-07-09T12:57:57.285Z',
            deletedAt: null,
            productId: null,
            oldAvatarUserId: null,
            oldCoverUserId: null,
            documentId: null,
          },
          role: 'user',
          status: 'pending',
        },
      },
      {
        id: 'cmcvy6enx0021p801x6phtwea',
        targetId: '355e5823-a1b2-4c11-9320-eb2fae8ee96a',
        targetType: 'USER',
        activityType: 'USER_LOGGED_IN',
        uploaderId: '355e5823-a1b2-4c11-9320-eb2fae8ee96a',
        description: 'User Lường Thị Thảo logged in',
        changes: {
          loggedInUser: {
            id: '355e5823-a1b2-4c11-9320-eb2fae8ee96a',
            email: 'luongthao101103@gmail.com',
            gender: 'female',
            country: 'VN',
            updatedAt: '2025-07-09T12:40:14.263Z',
            phoneNumber: '0862865585',
            referenceId: 'vn-11080',
          },
        },
        createdAt: '2025-07-09T12:40:55.485Z',
        updatedAt: '2025-07-09T12:40:55.485Z',
        uploader: {
          id: '355e5823-a1b2-4c11-9320-eb2fae8ee96a',
          fullName: 'Lường Thị Thảo',
          email: 'luongthao101103@gmail.com',
          avatar: {
            id: '1fd86e42-a75b-4ca6-bafb-850add1e5b4c',
            fileName: 'avatar_1752064997472.jpg',
            mimeType: 'image',
            originalFileName: '233231.jpg',
            fileUrl:
              'https://2evl34cah0.ufs.sh/f/a6wlsorGVg4vEsU2z4gNbejhWkSVDqCTim2YAIa1JZrX6gP5',
            createdAt: '2025-07-09T12:43:17.473Z',
            updatedAt: '2025-07-09T12:43:17.473Z',
            deletedAt: null,
            productId: null,
            oldAvatarUserId: null,
            oldCoverUserId: null,
            documentId: null,
          },
          role: 'user',
          status: 'pending',
        },
      },
      {
        id: 'cmcvy63vo001zp801k7680s2p',
        targetId: '7d40fe77-7c7f-4e90-a6d9-e642d59de3e2',
        targetType: 'USER',
        activityType: 'USER_LOGGED_IN',
        uploaderId: '7d40fe77-7c7f-4e90-a6d9-e642d59de3e2',
        description: 'User Trần Nguyễn Thu Trang logged in',
        changes: {
          loggedInUser: {
            id: '7d40fe77-7c7f-4e90-a6d9-e642d59de3e2',
            email: 'trannguyenthutrang0802@gmail.com',
            gender: 'female',
            country: 'VN',
            updatedAt: '2025-07-09T12:40:01.474Z',
            phoneNumber: '0869726237',
            referenceId: 'vn-11084',
          },
        },
        createdAt: '2025-07-09T12:40:41.509Z',
        updatedAt: '2025-07-09T12:40:41.509Z',
        uploader: {
          id: '7d40fe77-7c7f-4e90-a6d9-e642d59de3e2',
          fullName: 'Trần Nguyễn Thu Trang',
          email: 'trannguyenthutrang0802@gmail.com',
          avatar: {
            id: '044c8f7c-4991-48a3-a571-6369243c1087',
            fileName: 'avatar_1752064707268.jpg',
            mimeType: 'image',
            originalFileName: 'avatar.jpg',
            fileUrl: 'https://i.pravatar.cc/150?img=58',
            createdAt: '2025-07-09T12:38:27.270Z',
            updatedAt: '2025-07-09T12:38:27.270Z',
            deletedAt: null,
            productId: null,
            oldAvatarUserId: null,
            oldCoverUserId: null,
            documentId: null,
          },
          role: 'user',
          status: 'active',
        },
      },
    ];

    return {
      data: mockData,
      total: 1299,
      page: 1,
      totalPages: 65,
    };
  }
}

export default ActivityLogsStore;
