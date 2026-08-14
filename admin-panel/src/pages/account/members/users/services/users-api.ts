import * as authHelper from '@/auth/lib/helpers';
import { API_BASE_URL } from '@/config/api.config';

export type UserRole = 'USER' | 'OPERATOR' | 'ADMIN';

export interface UserItem {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  pagination?: UserListResponse['pagination'];
  message?: string;
}

interface RawUserItem {
  _id?: string;
  id?: string;
  name?: string;
  mobile?: string;
  email?: string | null;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserListResponse {
  items: UserItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function normalizeRole(role: string | undefined): UserRole {
  const normalized = String(role || 'USER').toUpperCase();
  if (normalized === 'ADMIN' || normalized === 'OPERATOR') {
    return normalized;
  }

  return 'USER';
}

function mapUser(item: RawUserItem): UserItem {
  return {
    id: item.id || item._id || '',
    name: item.name || '-',
    mobile: item.mobile || '-',
    email: item.email || null,
    role: normalizeRole(item.role),
    createdAt: item.createdAt || '',
    updatedAt: item.updatedAt || '',
  };
}

function getAuthHeaders() {
  const auth = authHelper.getAuth();
  const token = auth?.access_token;

  if (!token) {
    throw new Error('You are not logged in. Please login and try again.');
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function listUsers(search = ''): Promise<UserListResponse> {
  const query = new URLSearchParams();

  if (search.trim()) {
    query.set('search', search.trim());
  }

  query.set('limit', '100');

  const response = await fetch(`${API_BASE_URL}/auth/users?${query.toString()}`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
    },
  });

  const json = await parseJson<ApiResponse<RawUserItem[]>>(response);

  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.message || 'Failed to fetch users');
  }

  const items = json.data.map(mapUser);

  return {
    items,
    pagination: json.pagination || {
      total: items.length,
      page: 1,
      limit: 100,
      totalPages: 1,
    },
  };
}

export async function getUserById(id: string): Promise<UserItem> {
  const response = await fetch(`${API_BASE_URL}/auth/users?limit=100`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
    },
  });

  const json = await parseJson<ApiResponse<RawUserItem[]>>(response);

  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.message || 'Failed to fetch user details');
  }

  const user = json.data.map(mapUser).find((item) => item.id === id);

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}
