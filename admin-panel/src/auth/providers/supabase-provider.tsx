import { PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { MenuAdapter } from '@/auth/adapters/menu-adapter';
import {
  CreateUserPayload,
  SupabaseAdapter,
} from '@/auth/adapters/supabase-adapter';
import { AuthContext } from '@/auth/context/auth-context';
import * as authHelper from '@/auth/lib/helpers';
import { AuthModel, UserModel } from '@/auth/lib/models';
import { MENU_SIDEBAR } from '@/config/menu.config';
import { MenuConfig, MenuItem } from '@/config/types';

function collectPaths(items: MenuConfig): string[] {
  const output: string[] = [];

  const walk = (nodes: MenuConfig) => {
    nodes.forEach((item: MenuItem) => {
      if (item.path && item.path.startsWith('/')) {
        output.push(item.path);
      }

      if (item.children?.length) {
        walk(item.children);
      }
    });
  };

  walk(items);
  return output;
}

function getFirstPath(items: MenuConfig): string {
  for (const item of items) {
    if (item.path && item.path.startsWith('/')) {
      return item.path;
    }
    if (item.children?.length) {
      const childPath = getFirstPath(item.children);
      if (childPath) {
        return childPath;
      }
    }
  }
  return '/';
}

// Define the Supabase Auth Provider
export function AuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<AuthModel | undefined>(authHelper.getAuth());
  const [currentUser, setCurrentUser] = useState<UserModel | undefined>();
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menu, setMenu] = useState<MenuConfig>(MENU_SIDEBAR);
  const [menuLoadedForToken, setMenuLoadedForToken] = useState<string | null>(
    null,
  );

  // Check if user is admin
  useEffect(() => {
    setIsAdmin(currentUser?.is_admin === true);
  }, [currentUser]);

  const loadMenu = useCallback(async (accessToken?: string, force = false) => {
    if (!accessToken) {
      setMenu(MENU_SIDEBAR);
      setMenuLoadedForToken(null);
      return;
    }
    if (!force && menuLoadedForToken === accessToken) {
      return;
    }

    setMenuLoading(true);
    try {
      const roleMenu = await MenuAdapter.getRoleMenu(accessToken);
      setMenu(roleMenu.length > 0 ? roleMenu : MENU_SIDEBAR);
      setMenuLoadedForToken(accessToken);
    } catch {
      setMenu(MENU_SIDEBAR);
      setMenuLoadedForToken(accessToken);
    } finally {
      setMenuLoading(false);
    }
  }, [menuLoadedForToken]);

  const verify = async () => {
    if (auth) {
      try {
        const user = await getUser();
        if (!user) {
          saveAuth(undefined);
          setCurrentUser(undefined);
          return;
        }
        setCurrentUser(user);
        await loadMenu(auth.access_token);
      } catch {
        saveAuth(undefined);
        setCurrentUser(undefined);
        setMenu(MENU_SIDEBAR);
        setMenuLoadedForToken(null);
      }
    } else {
      setMenu(MENU_SIDEBAR);
      setMenuLoadedForToken(null);
    }
  };

  const saveAuth = (auth: AuthModel | undefined) => {
    setAuth(auth);
    if (auth) {
      authHelper.setAuth(auth);
    } else {
      authHelper.removeAuth();
      setMenu(MENU_SIDEBAR);
      setMenuLoadedForToken(null);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const auth = await SupabaseAdapter.login(email, password);
      saveAuth(auth);
      const user = await getUser();
      setCurrentUser(user || undefined);
      await loadMenu(auth.access_token, true);
    } catch (error) {
      saveAuth(undefined);
      throw error;
    }
  };

  const register = async (payload: CreateUserPayload) => {
    try {
      await SupabaseAdapter.register(payload);
    } catch (error) {
      throw error;
    }
  };

  const requestPasswordReset = async (email: string) => {
    await SupabaseAdapter.requestPasswordReset(email);
  };

  const resetPassword = async (
    password: string,
    password_confirmation: string,
  ) => {
    await SupabaseAdapter.resetPassword(password, password_confirmation);
  };

  const resendVerificationEmail = async (email: string) => {
    await SupabaseAdapter.resendVerificationEmail(email);
  };

  const getUser = async () => {
    return await SupabaseAdapter.getCurrentUser();
  };

  const updateProfile = async (userData: Partial<UserModel>) => {
    return await SupabaseAdapter.updateUserProfile(userData);
  };

  const logout = () => {
    SupabaseAdapter.logout();
    saveAuth(undefined);
    setCurrentUser(undefined);
    setMenu(MENU_SIDEBAR);
    setMenuLoadedForToken(null);
  };

  const refreshMenu = useCallback(async () => {
    await loadMenu(auth?.access_token, true);
  }, [auth?.access_token, loadMenu]);

  const allowedPaths = useMemo(() => collectPaths(menu), [menu]);
  const defaultPath = useMemo(() => getFirstPath(menu), [menu]);

  const canAccessPath = useCallback(
    (path: string) => {
      if (!path.startsWith('/')) {
        return true;
      }

      // Administrators can access every protected admin route.
      if (isAdmin) {
        return true;
      }

      if (path === '/') {
        return allowedPaths.includes('/') || defaultPath === '/';
      }

      return allowedPaths.some(
        (menuPath) =>
          path === menuPath ||
          (menuPath !== '/' && path.startsWith(`${menuPath}/`)),
      );
    },
    [allowedPaths, defaultPath, isAdmin],
  );

  return (
    <AuthContext.Provider
      value={{
        loading,
        setLoading,
        auth,
        saveAuth,
        user: currentUser,
        setUser: setCurrentUser,
        login,
        register,
        requestPasswordReset,
        resetPassword,
        resendVerificationEmail,
        getUser,
        updateProfile,
        logout,
        verify,
        isAdmin,
        menu,
        menuLoading,
        refreshMenu,
        canAccessPath,
        defaultPath,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
