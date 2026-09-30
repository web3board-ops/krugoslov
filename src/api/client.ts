import { useStore } from '../store';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/['"]+/g, '').replace(/\/+$/, '');

class ApiError extends Error {
  code: string;
  status: number;
  details?: any;

  constructor(status: number, code: string, message: string, details?: any) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const TOKEN_STORAGE_KEY = 'wordflow_access_token';

let accessToken: string | null = localStorage.getItem(TOKEN_STORAGE_KEY);
let refreshPromise: Promise<string> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Refresh failed');
      }

      const data = await response.json();
      accessToken = data.access_token;
      useStore.getState().setAccessToken(accessToken);
      return accessToken!;
    } catch (error) {
      // Refresh failed, logout
      useStore.getState().logout();
      throw error;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
  }

  let response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Handle 401 - try refresh
  if (response.status === 401 && accessToken) {
    try {
      await refreshAccessToken();
      
      // Retry request with new token
      (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
      response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });
    } catch (error) {
      throw new ApiError(401, 'auth_failed', 'Authentication failed');
    }
  }

  if (!response.ok) {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: { code: 'unknown_error', message: 'Unknown error' } };
    }

    const detail = errorData.detail || errorData;
    throw new ApiError(
      response.status,
      detail.code || 'unknown_error',
      detail.message || 'Request failed',
      detail.details
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// === Auth API ===
export const authApi = {
  register: (email: string, password: string) =>
    request<{ access_token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ access_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    request<void>('/auth/logout', {
      method: 'POST',
    }),

  getMe: () => request<any>('/auth/me'),
};

// === Onboarding API ===
export const onboardingApi = {
  complete: (timezone: string, level: string) =>
    request<void>('/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify({ timezone, level }),
    }),
};

// === Dashboard API ===
export const dashboardApi = {
  getSummary: () => request<any>('/dashboard/summary'),
};

// === Lesson API ===
export const lessonApi = {
  preview: () => request<any>('/lesson/preview', { method: 'POST' }),

  declineNewWord: (wordId: number) =>
    request<any>('/lesson/new-word/decline', {
      method: 'POST',
      body: JSON.stringify({ word_id: wordId }),
    }),

  start: (wordIds: number[]) =>
    request<any>('/lesson/start', {
      method: 'POST',
      body: JSON.stringify({ word_ids: wordIds }),
    }),

  evaluate: (exerciseId: number, userTranslation: string | null, dontKnow: boolean) =>
    request<any>('/lesson/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        exercise_id: exerciseId,
        user_translation: userTranslation,
        dont_know: dontKnow,
      }),
    }),

  getCurrent: (lessonId: number) =>
    request<any>(`/lesson/${lessonId}/current`),

  getSummary: (lessonId: number) =>
    request<any>(`/lesson/${lessonId}/summary`),

  abandon: (lessonId: number) =>
    request<void>(`/lesson/${lessonId}/abandon`, { method: 'POST' }),

  handleSuggestion: (exerciseId: number, wordId: number, action: 'add' | 'ignore') =>
    request<void>(`/lesson/exercises/${exerciseId}/suggestions/${wordId}`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),
};

// === Vocabulary API ===
export const vocabularyApi = {
  getList: (status?: string, query?: string, page: number = 1, pageSize: number = 20) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (query) params.append('q', query);
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());
    return request<any>(`/vocabulary/list?${params.toString()}`);
  },

  getWord: (wordId: number) => request<any>(`/vocabulary/word/${wordId}`),

  changeStatus: (wordId: number, status: string) =>
    request<void>(`/vocabulary/word/${wordId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

// === Profile API ===
export const profileApi = {
  getStats: () => request<any>('/profile/stats'),
};

// === Settings API ===
export const settingsApi = {
  updateTimezone: (timezone: string) =>
    request<any>('/settings/timezone', {
      method: 'PATCH',
      body: JSON.stringify({ timezone }),
    }),

  getLearningProfile: () => request<any>('/learning-profile'),

  updateLearningProfile: (data: any) =>
    request<void>('/learning-profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getDictionaries: () => request<any[]>('/dictionaries'),
};

// === Admin API ===
export const adminApi = {
  importDictionary: (file: File, dryRun: boolean = false) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return request<any>(`/admin/dictionaries/import?dry_run=${dryRun}`, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type, let browser set it with boundary
      },
    });
  },

  getReports: (status?: string, page: number = 1) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('page', page.toString());
    return request<any[]>(`/admin/reports?${params.toString()}`);
  },

  updateReport: (reportId: number, status: string, adminNote?: string) =>
    request<void>(`/admin/reports/${reportId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, admin_note: adminNote }),
    }),

  getUsers: (query?: string, page: number = 1) => {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    params.append('page', page.toString());
    return request<any[]>(`/admin/users?${params.toString()}`);
  },

  resetPassword: (userId: number) =>
    request<{ temp_password: string }>(`/admin/users/${userId}/reset-password`, {
      method: 'POST',
    }),
};
