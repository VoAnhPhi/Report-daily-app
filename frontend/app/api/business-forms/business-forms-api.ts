import { AuthUser } from '@/lib/auth';
import api, { makeRequest } from '..';
import {
  BusinessForm,
  CheckMstResult,
  CreateBusinessFormDto,
  GetBusinessFormsQueryDto,
  MstLookupResult,
  PaginatedBusinessFormsResponse,
  UpdateBusinessFormDto,
} from '@/types/business-form.type';
import { business_forms } from '@/app/api/APIRouters/business-forms.router';

class GetBusinessFormsApi {
  constructor(
    private tokens?: {
      accessToken?: string;
      refreshToken?: string;
      user?: AuthUser;
    },
  ) {}

  async getMyForms(query: GetBusinessFormsQueryDto): Promise<PaginatedBusinessFormsResponse> {
    const params = new URLSearchParams();
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));
    if (query.status) params.append('status', query.status);
    if (query.includeDeleted) params.append('includeDeleted', 'true');
    if (query.search) params.append('search', query.search);
    if (query.onBehalfOfUserId)
      params.append('onBehalfOfUserId', query.onBehalfOfUserId);

    const response = await api.get<PaginatedBusinessFormsResponse>(
      `${business_forms.me}?${params.toString()}`,
      { ...this.tokens },
    );
    return response.data;
  }

  async getMyFormById(id: string): Promise<BusinessForm> {
    const response = await api.get<BusinessForm>(business_forms.meDetail(id), {
      ...this.tokens,
    });
    return response.data;
  }

  async checkMst(taxCode: string): Promise<CheckMstResult> {
    const params = new URLSearchParams({ taxCode });
    const response = await api.get<CheckMstResult>(
      `${business_forms.checkMst}?${params.toString()}`,
      { ...this.tokens },
    );
    return response.data;
  }

  async lookupMst(taxCode: string): Promise<MstLookupResult> {
    const params = new URLSearchParams({ taxCode });
    const response = await api.get<MstLookupResult>(
      `${business_forms.lookupMst}?${params.toString()}`,
      { ...this.tokens },
    );
    return response.data;
  }
}

class PostBusinessFormsApi {
  constructor(
    private tokens?: {
      accessToken?: string;
      refreshToken?: string;
      user?: AuthUser;
    },
  ) {}

  async createForm(
    data: CreateBusinessFormDto,
    onBehalfOfUserId?: string,
  ): Promise<BusinessForm> {
    // Làm thay: tạo đối tác hộ người được chăm (BE verify quan hệ Baby).
    const url = onBehalfOfUserId
      ? `${business_forms.base}?onBehalfOfUserId=${encodeURIComponent(onBehalfOfUserId)}`
      : business_forms.base;
    const response = await api.post<BusinessForm>(url, {
      data,
      ...this.tokens,
    });
    return response.data;
  }
}

class PatchBusinessFormsApi {
  constructor(
    private tokens?: {
      accessToken?: string;
      refreshToken?: string;
      user?: AuthUser;
    },
  ) {}

  async updateForm(id: string, data: UpdateBusinessFormDto): Promise<BusinessForm> {
    const response = await makeRequest<BusinessForm>(
      'PATCH',
      business_forms.byId(id),
      {
        data,
        accessToken: this.tokens?.accessToken,
        refreshToken: this.tokens?.refreshToken,
        user: this.tokens?.user,
      },
    );
    return response.data;
  }
}

class DeleteBusinessFormsApi {
  constructor(
    private tokens?: {
      accessToken?: string;
      refreshToken?: string;
      user?: AuthUser;
    },
  ) {}

  async softDelete(id: string): Promise<void> {
    await makeRequest<void>(
      'DELETE',
      business_forms.byId(id),
      {
        accessToken: this.tokens?.accessToken,
        refreshToken: this.tokens?.refreshToken,
        user: this.tokens?.user,
      },
    );
  }
}

export const createBusinessFormsApis = (tokens: {
  accessToken: string;
  refreshToken?: string;
  user?: AuthUser;
}) => ({
  get: new GetBusinessFormsApi(tokens),
  post: new PostBusinessFormsApi(tokens),
  patch: new PatchBusinessFormsApi(tokens),
  delete: new DeleteBusinessFormsApi(tokens),
});

export {
  GetBusinessFormsApi,
  PostBusinessFormsApi,
  PatchBusinessFormsApi,
  DeleteBusinessFormsApi,
};
