'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';

/** Người đang được "làm thay" (người được chăm). */
export interface CareUser {
  /** id User của người được chăm — gửi làm onBehalfOfUserId. */
  id: string;
  fullName: string;
}

interface CaregiverContextValue {
  careUser: CareUser | null;
  setCareUser: (u: CareUser | null) => void;
}

const CaregiverContext = createContext<CaregiverContextValue>({
  careUser: null,
  setCareUser: () => {},
});

/**
 * Bọc phần "Công việc" để bật chế độ làm thay (người chăm sóc thao tác hộ).
 * CHỦ Ý chỉ bọc trang /tasks: mọi nơi khác (widget đối tác, thông báo) nằm ngoài
 * provider nên `careUser` luôn null → hành vi bình thường, không lẫn ngữ cảnh.
 */
export function CaregiverProvider({ children }: { children: ReactNode }) {
  const [careUser, setCareUser] = useState<CareUser | null>(null);
  const value = useMemo(() => ({ careUser, setCareUser }), [careUser]);
  return (
    <CaregiverContext.Provider value={value}>
      {children}
    </CaregiverContext.Provider>
  );
}

export function useCaregiver() {
  return useContext(CaregiverContext);
}

/** id để gửi kèm request khi làm thay (undefined nếu đang là chính mình). */
export function useOnBehalfParam(): string | undefined {
  return useContext(CaregiverContext).careUser?.id;
}

/**
 * id người mà QUYỀN được tính theo: người được chăm nếu đang làm thay, ngược lại
 * là chính mình. Có fallback session nên dùng được cả ngoài provider.
 */
export function useEffectiveUserId(): string | undefined {
  const { careUser } = useContext(CaregiverContext);
  const { data: session } = useSession();
  return careUser?.id ?? session?.user?.id;
}
