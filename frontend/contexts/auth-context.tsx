'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { UserAdminRole } from '@/lib/auth';
import { getAuthApi } from '@/app/api/auth';

interface AuthContextValue {
  permissions: string[];
  adminRoles: UserAdminRole[];
  isLoadingPermissions: boolean;
  hasPermission: (code: string) => boolean;
  hasRole: (code: string) => boolean;
}

const AuthContext = createContext<AuthContextValue>({
  permissions: [],
  adminRoles: [],
  isLoadingPermissions: true,
  hasPermission: () => false,
  hasRole: () => false,
});

export const useAuthContext = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const { data: session } = useSession();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [adminRoles, setAdminRoles] = useState<UserAdminRole[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);

  useEffect(() => {
    if (session?.accessToken) {
      setIsLoadingPermissions(true);
      getAuthApi
        .getPermissions(session.accessToken)
        .then((data) => {
          setPermissions(data.userPermissions || []);
          setAdminRoles(data.userAdminRoles || []);
        })
        .catch((error) => {
          console.error('Failed to fetch permissions:', error);
          setPermissions([]);
          setAdminRoles([]);
        })
        .finally(() => {
          setIsLoadingPermissions(false);
        });
    } else {
      setPermissions([]);
      setAdminRoles([]);
      setIsLoadingPermissions(false);
    }
  }, [session?.accessToken]);

  const hasPermission = (code: string): boolean => {
    return permissions.includes(code);
  };

  const hasRole = (code: string): boolean => {
    return adminRoles.some((r) => r.role?.code === code);
  };

  return (
    <AuthContext.Provider
      value={{
        permissions,
        adminRoles,
        isLoadingPermissions,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
