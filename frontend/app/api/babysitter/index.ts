import api from '..';
import { AuthUser } from '@/lib/auth';
import { APIRouters } from '../APIRouters';
import {
  PaginatedTeamCareOrders,
  TeamCareSummary,
  TeamCareTotals,
} from '@/types/team-care.type';
import { MyBabiesResponse } from '@/types/babysitter.type';

class GetBabysitterApi {
  constructor(
    private tokens?: {
      accessToken?: string;
      refreshToken?: string;
      user?: AuthUser;
    },
  ) {}

  /** Người tôi đang chăm sóc — cuộn tới đâu tải tới đó (search theo tên/sđt/mã). */
  async getMyBabies(page = 1, pageSize = 20, search?: string) {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
    if (search) params.append('search', search);
    const res = await api.get<MyBabiesResponse>(
      `${APIRouters.babysitter.myBabies}?${params}`,
      { ...this.tokens },
    );
    return res.data;
  }

  async getTeamCareTotal(teamId: string) {
    const res = await api.get<TeamCareTotals>(
      APIRouters.babysitter.teamCareTotal(teamId),
      { ...this.tokens },
    );
    return res.data;
  }

  async getTeamCareSummary(teamId: string, page = 1, pageSize = 20) {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
    const res = await api.get<TeamCareSummary>(
      `${APIRouters.babysitter.teamCareSummary(teamId)}?${params}`,
      { ...this.tokens },
    );
    return res.data;
  }

  async getTeamCareOrders(teamId: string, page = 1, pageSize = 20) {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
    const res = await api.get<PaginatedTeamCareOrders>(
      `${APIRouters.babysitter.teamCareOrders(teamId)}?${params}`,
      { ...this.tokens },
    );
    return res.data;
  }
}

export const createBabysitterApis = (tokens?: {
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUser;
}) => ({
  get: new GetBabysitterApi(tokens),
});
