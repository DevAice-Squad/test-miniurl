import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import toast from 'react-hot-toast';
import {
  User,
  Url,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  CreateUrlRequest,
  UpdateUrlRequest,
  UrlAnalytics,
  AdminDashboard,
  PaginatedResponse,
  PaginationParams,
  Algorithm,
  ApiResponse,
  ChangePasswordRequest
} from '../types';

// API Configuration
// In production, use relative URLs since frontend proxy handles routing to backend
// In development, use localhost:5000 for direct backend access
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' // Use relative URLs in production (proxied by frontend service)
  : (process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000');

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error: AxiosError) => {
        this.handleApiError(error);
        return Promise.reject(error);
      }
    );
  }

  private handleApiError(error: AxiosError) {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return;
    }

    // Show error toast for other errors
    const errorMessage = (error.response?.data as any)?.message || 'An error occurred';
    toast.error(errorMessage);
  }

  // Authentication endpoints
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/auth/register', data);
    return response.data;
  }

  async getProfile(): Promise<{ user: User }> {
    const response = await this.api.get<{ user: User }>('/auth/profile');
    return response.data;
  }

  async updateProfile(data: Partial<User>): Promise<{ user: User }> {
    const response = await this.api.put<{ user: User }>('/auth/profile', data);
    return response.data;
  }

  async changePassword(data: ChangePasswordRequest): Promise<{ message: string }> {
    const response = await this.api.put<{ message: string }>('/auth/change-password', data);
    return response.data;
  }

  // URL endpoints
  async shortenUrl(data: CreateUrlRequest): Promise<{ data: Url }> {
    const response = await this.api.post<{ data: Url }>('/urls/shorten', data);
    return response.data;
  }

  async getUserUrls(params?: PaginationParams): Promise<PaginatedResponse<Url>> {
    const response = await this.api.get<PaginatedResponse<Url>>('/urls/user/urls', { params });
    return response.data;
  }

  async getUrlAnalytics(id: number, period = 'month'): Promise<UrlAnalytics> {
    const response = await this.api.get<UrlAnalytics>(`/urls/analytics/${id}`, {
      params: { period }
    });
    return response.data;
  }

  async updateUrl(id: number, data: UpdateUrlRequest): Promise<{ data: Url }> {
    const response = await this.api.put<{ data: Url }>(`/urls/${id}`, data);
    return response.data;
  }

  async deleteUrl(id: number): Promise<{ message: string }> {
    const response = await this.api.delete<{ message: string }>(`/urls/${id}`);
    return response.data;
  }

  // Admin endpoints
  async getAdminDashboard(period = 'month'): Promise<AdminDashboard> {
    const response = await this.api.get<AdminDashboard>('/admin/analytics/dashboard', {
      params: { period }
    });
    return response.data;
  }

  async getAdminUsers(params?: PaginationParams): Promise<PaginatedResponse<User>> {
    const response = await this.api.get<PaginatedResponse<User>>('/admin/users', { params });
    return response.data;
  }

  async createUser(data: RegisterRequest & { role?: string }): Promise<{ data: User }> {
    const response = await this.api.post<{ data: User }>('/admin/users', data);
    return response.data;
  }

  async updateUser(id: number, data: Partial<User>): Promise<{ data: User }> {
    const response = await this.api.put<{ data: User }>(`/admin/users/${id}`, data);
    return response.data;
  }

  async deleteUser(id: number): Promise<{ message: string }> {
    const response = await this.api.delete<{ message: string }>(`/admin/users/${id}`);
    return response.data;
  }

  async getAdminUrls(params?: PaginationParams): Promise<PaginatedResponse<Url>> {
    const response = await this.api.get<PaginatedResponse<Url>>('/admin/urls', { params });
    return response.data;
  }

  // API v1 endpoints for developers
  async apiShortenUrl(data: CreateUrlRequest): Promise<ApiResponse<Url>> {
    const response = await this.api.post<ApiResponse<Url>>('/api/v1/shorten', data);
    return response.data;
  }

  async apiBulkShortenUrls(data: { urls: CreateUrlRequest[], algorithm?: string, custom_options?: any }): Promise<ApiResponse<any>> {
    const response = await this.api.post<ApiResponse<any>>('/api/v1/shorten/bulk', data);
    return response.data;
  }

  async getUrlInfo(shortCode: string, includeAnalytics = false): Promise<ApiResponse<Url>> {
    const response = await this.api.get<ApiResponse<Url>>(`/api/v1/url/${shortCode}`, {
      params: { include_analytics: includeAnalytics }
    });
    return response.data;
  }

  async validateUrl(url: string): Promise<ApiResponse<any>> {
    const response = await this.api.post<ApiResponse<any>>('/api/v1/validate', { url });
    return response.data;
  }

  async getAlgorithms(): Promise<ApiResponse<{ algorithms: Algorithm[] }>> {
    const response = await this.api.get<ApiResponse<{ algorithms: Algorithm[] }>>('/api/v1/algorithms');
    return response.data;
  }

  async getApiStats(period = 'month'): Promise<ApiResponse<any>> {
    const response = await this.api.get<ApiResponse<any>>('/api/v1/stats', {
      params: { period }
    });
    return response.data;
  }

  // Utility methods
  async checkHealth(): Promise<{ status: string }> {
    const response = await this.api.get<{ status: string }>('/health');
    return response.data;
  }

  async getApiDocs(): Promise<any> {
    const response = await this.api.get('/api/docs');
    return response.data;
  }

  // File upload (if needed in the future)
  async uploadFile(file: File, endpoint: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await this.api.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Get instance for custom requests
  getInstance(): AxiosInstance {
    return this.api;
  }
}

// Create and export singleton instance
const apiService = new ApiService();
export default apiService;

// Export specific methods for easier importing
export const {
  login,
  register,
  getProfile,
  updateProfile,
  changePassword,
  shortenUrl,
  getUserUrls,
  getUrlAnalytics,
  updateUrl,
  deleteUrl,
  getAdminDashboard,
  getAdminUsers,
  createUser,
  updateUser,
  deleteUser,
  getAdminUrls,
  apiShortenUrl,
  apiBulkShortenUrls,
  getUrlInfo,
  validateUrl,
  getAlgorithms,
  getApiStats,
  checkHealth,
  getApiDocs,
} = apiService; 