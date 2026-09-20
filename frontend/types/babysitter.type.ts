/** Một dòng "người tôi đang chăm sóc" trả từ GET /babysitter/my-babies. */
export interface MyBaby {
  /** id của bản ghi Baby (không phải id user). */
  id: string;
  /** approved | pending | rejected | cancelled — chỉ approved+chưa drop mới thao tác hộ được. */
  status: string;
  droppedAt: string | null;
  /** Người được chăm (User thật) — id này dùng làm onBehalfOfUserId. */
  user: {
    id: string;
    fullName: string;
    email?: string | null;
    phoneNumber?: string | null;
    referenceId?: string | null;
    avatar?: { fileUrl: string | null } | null;
  };
}

export interface MyBabiesResponse {
  data: MyBaby[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
}
