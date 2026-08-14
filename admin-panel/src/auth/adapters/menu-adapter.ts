import { MenuConfig, MenuItem } from '@/config/types';
import { API_BASE_URL } from '@/config/api.config';

const MENU_ENDPOINT = import.meta.env.VITE_MENU_ENDPOINT?.trim() || '/auth/menu';

interface MenuResponse {
  success?: boolean;
  menu?: unknown;
  data?: unknown;
  items?: unknown;
  message?: string;
}

function normalizeMenuItem(item: unknown): MenuItem | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const candidate = item as Record<string, unknown>;
  const childItems = Array.isArray(candidate.children)
    ? candidate.children
        .map((child) => normalizeMenuItem(child))
        .filter((entry): entry is MenuItem => Boolean(entry))
    : undefined;

  const title =
    typeof candidate.title === 'string' ? candidate.title.trim() : undefined;
  const heading =
    typeof candidate.heading === 'string' ? candidate.heading.trim() : undefined;

  if (!title && !heading) {
    return null;
  }

  return {
    title,
    heading,
    path: typeof candidate.path === 'string' ? candidate.path.trim() : undefined,
    disabled:
      typeof candidate.disabled === 'boolean' ? candidate.disabled : undefined,
    collapse:
      typeof candidate.collapse === 'boolean' ? candidate.collapse : undefined,
    collapseTitle:
      typeof candidate.collapseTitle === 'string'
        ? candidate.collapseTitle
        : undefined,
    expandTitle:
      typeof candidate.expandTitle === 'string'
        ? candidate.expandTitle
        : undefined,
    badge: typeof candidate.badge === 'string' ? candidate.badge : undefined,
    children: childItems && childItems.length > 0 ? childItems : undefined,
  };
}

function normalizeMenu(payload: unknown): MenuConfig {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => normalizeMenuItem(item))
    .filter((entry): entry is MenuItem => Boolean(entry));
}

function resolveUrl(baseUrl: string, endpoint: string) {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }

  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  return `${normalizedBase}${normalizedEndpoint}`;
}

export const MenuAdapter = {
  async getRoleMenu(token: string): Promise<MenuConfig> {
    const bearerToken = String(token || '').trim();

    if (
      !bearerToken ||
      bearerToken === 'undefined' ||
      bearerToken === 'null'
    ) {
      return [];
    }

    const response = await fetch(resolveUrl(API_BASE_URL, MENU_ENDPOINT), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    });

    if (response.status === 401 || response.status === 403) {
      return [];
    }

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as MenuResponse;
    const menu = payload.menu ?? payload.data ?? payload.items;

    return normalizeMenu(menu);
  },
};
