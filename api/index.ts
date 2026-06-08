/**
 * API 客户端
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: '/api/v1',
      timeout: 30000,
    });

    this.client.interceptors.request.use((config) => {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('current_user');
          }
          window.location.reload();
        }
        return Promise.reject(new Error(error.response?.data?.message || error.message));
      }
    );
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data;
  }
}

export const api = new ApiClient();

// API 方法定义
export const authApi = {
  login: (username: string, password: string) =>
    api.post<{ token: string; user: any }>('/auth/login', { username, password }),
  getCurrentUser: () => api.get<any>('/auth/me'),
  changePassword: (oldPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { old_password: oldPassword, new_password: newPassword }),
  getLoginLogs: (limit?: number) => api.get<any>('/auth/login-logs', { params: { limit } }),
};

export const detectApi = {
  detect: (text: string, category?: string, withPos: boolean = true, useAI: boolean = false) =>
    api.post('/detect', { text, category: category || undefined, with_pos: withPos, use_ai: useAI }),
  detectAll: (text: string, withPos: boolean = true, useAI: boolean = false) =>
    api.post('/detect/all', { text, with_pos: withPos, use_ai: useAI }),
  filter: (text: string, category?: string) =>
    api.post('/filter', { text, category: category || undefined }),
};

export const wordsApi = {
  get: (params?: { page?: number; page_size?: number; category?: string; keyword?: string }) =>
    api.get<any>('/words', { params }),
  add: (words: Record<string, string>, reasons?: Record<string, string>) =>
    api.post<any>('/words', { words, reasons: reasons || undefined }),
  delete: (words: string[]) => api.delete<any>('/words', { data: { words } }),
  clear: () => api.delete<number>('/words/clear'),
};

export const categoriesApi = {
  get: () => api.get<Record<string, string>>('/categories'),
};

export const configApi = {
  get: () => api.get<any>('/config'),
  getSystemTitle: () => api.get<{ title: string; show_default_password: boolean }>('/system/title'),
  update: (data: any) => api.post<any>('/config/update', data),
  reloadConfig: () => api.post('/config/reload'),
  restart: () => api.post('/config/restart'),
};

export const usersApi = {
  list: (params?: { page?: number; page_size?: number }) =>
    api.get<any>('/users', { params }),
  create: (data: { username: string; password: string; roles: string[]; is_active: boolean }) =>
    api.post('/users', data),
  delete: (userId: string) => api.delete(`/users/${userId}`),
  update: (userId: string, data: any) => api.put(`/users/${userId}`, data),
  getAllLoginLogs: (params?: { page?: number; page_size?: number; username?: string }) =>
    api.get<{ logs: any[]; total: number; page: number; page_size: number }>('/admin/login-logs', { params }),
};

export const accessKeysApi = {
  list: () => api.get<any>('/access-keys'),
  create: (data: {
    name: string;
    description?: string;
    permissions?: Array<{ resource: string; actions: string[] }>;
    ip_whitelist?: string[];
    rate_limit?: number;
    expires_at?: string | null;
  }) => api.post<any>('/access-keys', data),
  get: (id: string) => api.get<any>(`/access-keys/${id}`),
  update: (id: string, data: any) => api.put<any>(`/access-keys/${id}`, data),
  delete: (id: string) => api.delete<any>(`/access-keys/${id}`),
  disable: (id: string) => api.post<any>(`/access-keys/${id}/disable`),
  enable: (id: string) => api.post<any>(`/access-keys/${id}/enable`),
};

export const healthApi = {
  check: () => api.get('/health'),
};

export const logsApi = {
  getStats: (startTime: string, endTime: string, groupBy?: string) =>
    api.get<{ total_requests: number; sensitive_requests: number; category_stats: Record<string, number> }>('/logs/stats', {
      params: { start_time: startTime, end_time: endTime, group_by: groupBy }
    }),
};
