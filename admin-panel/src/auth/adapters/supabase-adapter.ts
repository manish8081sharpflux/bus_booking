import * as authHelper from '@/auth/lib/helpers';
import { AuthModel, UserModel } from '@/auth/lib/models';
import { API_BASE_URL } from '@/config/api.config';

type BackendUser = {
  id: string;
  name?: string;
  displayName?: string;
  mobile?: string;
  phone?: string;
  email?: string | null;
  role?: string;
  roles?: string[];
};

interface LoginResponse {
  success: boolean;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: BackendUser;
  message?: string;
}

export interface CreateUserPayload {
  name: string;
  mobile: string;
  email?: string;
  password: string;
  role: 'ADMIN' | 'OPERATOR' | 'USER';
  adminCreationKey?: string;
}

interface MeResponse {
  success: boolean;
  user?: BackendUser;
  message?: string;
}

function mapUserToModel(user: BackendUser): UserModel {
  const phone = user.mobile || user.phone || '';
  const fullName = user.name || user.displayName || phone || user.email || 'User';
  const roleCodes = user.roles || (user.role ? [user.role] : []);
  const primaryRole = roleCodes[0] || user.role || 'USER';

  return {
    id: user.id,
    username: phone || user.email || user.id,
    email: user.email || '',
    first_name: fullName,
    last_name: '',
    fullname: fullName,
    phone,
    is_admin: roleCodes.some((role) => role === 'ADMIN' || role === 'SUPER_ADMIN'),
    roles: [],
    role: primaryRole,
  };
}

function getTokenRoles(token: string): string[] {
  try {
    const encodedPayload = token.split('.')[1];
    if (!encodedPayload) return [];
    const normalized = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(normalized)) as { roleCodes?: string[]; role?: string };
    return payload.roleCodes || (payload.role ? [payload.role] : []);
  } catch {
    return [];
  }
}

function buildAuthError(message: string) {
  return new Error(message || 'Authentication request failed');
}

/**
 * NOTE:
 * Kept the name `SupabaseAdapter` to avoid touching many imports.
 * Internally this adapter now talks to backend auth-service endpoints.
 */
export const SupabaseAdapter = {
  async login(mobile: string, password: string): Promise<AuthModel> {
    const payload = {
      mobile: mobile.trim(),
      password,
    };

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as LoginResponse;

    const token = data.token || data.accessToken;
    if (!response.ok || !data.success || !token) {
      throw buildAuthError(data.message || 'Invalid mobile number or password');
    }

    return {
      access_token: token,
      refresh_token: data.refreshToken || '',
    };
  },

  async signInWithOAuth(): Promise<void> {
    throw new Error('OAuth login is not enabled in backend auth-service');
  },

  async register(payload: CreateUserPayload): Promise<AuthModel> {
    const requestBody = {
      name: payload.name.trim(),
      mobile: payload.mobile.trim(),
      email: payload.email?.trim() || undefined,
      password: payload.password,
      role: payload.role,
      adminCreationKey: payload.adminCreationKey?.trim() || undefined,
    };

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = (await response.json()) as LoginResponse;

    if (!response.ok || !data.success || !data.token) {
      throw buildAuthError(data.message || 'User registration failed');
    }

    return {
      access_token: data.token,
      refresh_token: '',
    };
  },

  async requestPasswordReset(): Promise<void> {
    throw new Error(
      'Password reset is not configured for backend auth-service yet.',
    );
  },

  async resetPassword(): Promise<void> {
    throw new Error(
      'Password reset is not configured for backend auth-service yet.',
    );
  },

  async resendVerificationEmail(): Promise<void> {
    throw new Error('Email verification is not enabled in backend auth-service');
  },

  async getCurrentUser(): Promise<UserModel | null> {
    const auth = authHelper.getAuth();
    const token = auth?.access_token;

    if (!token) {
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401 || response.status === 403) {
      authHelper.removeAuth();
      throw buildAuthError('Your session has expired. Please sign in again.');
    }

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as MeResponse;

    if (!data.success || !data.user) {
      return null;
    }

    return mapUserToModel({
      ...data.user,
      roles: data.user.roles?.length ? data.user.roles : getTokenRoles(token),
    });
  },

  async getUserProfile(): Promise<UserModel> {
    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error('User not found');
    }

    return user;
  },

  async updateUserProfile(): Promise<UserModel> {
    throw new Error('Profile update is not configured for backend auth-service');
  },

  async logout(): Promise<void> {
    return Promise.resolve();
  },

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL.replace(/\/api\/?$/, '')}/health`);
      return response.ok;
    } catch {
      return false;
    }
  },
};
