const BASE = '';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error: any = new Error(data.error || 'Erro desconhecido');
    error.status = res.status;
    throw error;
  }
  return data as T;
}

export const api = {
  // Auth
  login: (password: string) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () =>
    request('/api/auth/logout', { method: 'POST' }),
  checkAuth: () =>
    request<{ authenticated: boolean }>('/api/auth/check'),

  // Contacts
  getContacts: (params: { status?: string; search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.search) qs.set('search', params.search);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    return request<{ contacts: any[]; total: number; page: number; limit: number }>(
      `/api/contacts?${qs.toString()}`
    );
  },

  // Stats
  getStats: () => request<any>('/api/stats'),

  // Import
  importContacts: (groupJid?: string) =>
    request<{ imported: number; skipped: number; total: number }>('/api/import', {
      method: 'POST',
      body: JSON.stringify({ groupJid }),
    }),

  // Groups
  getGroups: () => request<any[]>('/api/groups'),

  // Outreach
  startOutreach: (batchSize: number) =>
    request('/api/outreach/start', {
      method: 'POST',
      body: JSON.stringify({ batchSize }),
    }),
  pauseOutreach: () =>
    request('/api/outreach/pause', { method: 'POST' }),
  getOutreachStatus: () =>
    request<any>('/api/outreach/status'),

  // Settings
  getSettings: () => request<any>('/api/settings'),
  saveSettings: (settings: any) =>
    request('/api/settings', { method: 'PUT', body: JSON.stringify(settings) }),

  // Webhook
  setupWebhook: () =>
    request('/api/webhook/setup', { method: 'POST' }),
};
