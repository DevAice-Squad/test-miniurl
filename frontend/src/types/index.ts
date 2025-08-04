// User types
export interface User {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'admin';
  isActive: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// URL types
export interface Url {
  id: number;
  original_url: string;
  short_url: string;
  full_short_url: string;
  title?: string;
  description?: string;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  click_count?: number;
  user?: User;
}

export interface CreateUrlRequest {
  original_url: string;
  title?: string;
  description?: string;
  expires_at?: string;
  algorithm?: 'hash' | 'uuid' | 'custom';
  custom_options?: CustomAlgorithmOptions;
}

export interface UpdateUrlRequest {
  original_url?: string;
  title?: string;
  description?: string;
  expires_at?: string;
  is_active?: boolean;
}

export interface CustomAlgorithmOptions {
  length?: number;
  includeNumbers?: boolean;
  includeUppercase?: boolean;
  includeLowercase?: boolean;
  excludeSimilar?: boolean;
}

// Analytics types
export interface UrlAnalytics {
  url: {
    id: number;
    original_url: string;
    short_url: string;
    title?: string;
    created_at: string;
  };
  analytics: {
    total_clicks: number;
    clicks_in_period: number;
    period: string;
    top_referrers: ReferrerStat[];
    clicks_by_date: ClicksByDate[];
    device_stats: DeviceStat[];
  };
}

export interface ReferrerStat {
  referer: string;
  count: number;
}

export interface ClicksByDate {
  date: string;
  count: number;
}

export interface DeviceStat {
  device_type: 'desktop' | 'mobile' | 'tablet' | 'other';
  count: number;
}

// Admin types
export interface AdminDashboard {
  summary: {
    total_users: number;
    total_urls: number;
    total_clicks: number;
    active_urls: number;
    new_users: number;
    new_urls: number;
    clicks_in_period: number;
    period: string;
  };
  top_urls: TopUrl[];
  clicks_by_date: ClicksByDate[];
  top_referrers: ReferrerStat[];
}

export interface TopUrl {
  id: number;
  original_url: string;
  short_url: string;
  title?: string;
  click_count: number;
  user?: {
    username: string;
  };
}

export interface UserActivity {
  id: number;
  action: string;
  original_url: string;
  short_url: string;
  title?: string;
  created_at: string;
  user: User;
}

// API types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    request_id?: string;
    timestamp: string;
    rate_limit_remaining?: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
  };
}

export interface Algorithm {
  name: string;
  description: string;
  default_length: number;
  supports_custom_options: boolean;
  options?: Record<string, string>;
}

// Form types
export interface FormError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationError {
  error: string;
  message: string;
  details: FormError[];
}

// UI types
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export interface MenuItem {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ComponentType<any>;
  disabled?: boolean;
  children?: MenuItem[];
}

export interface StatCard {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
    period: string;
  };
  icon?: React.ComponentType<any>;
  color?: 'primary' | 'success' | 'warning' | 'danger';
}

// Context types
export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (data: ChangePasswordRequest) => Promise<void>;
}

export interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

// Hook types
export interface UseLocalStorageReturn<T> {
  value: T;
  setValue: (value: T | ((prev: T) => T)) => void;
  removeValue: () => void;
}

export interface UsePaginationReturn {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextPage: () => void;
  previousPage: () => void;
  goToPage: (page: number) => void;
}

// API Configuration
export interface ApiConfig {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
}

// Environment variables
export interface EnvConfig {
  API_BASE_URL: string;
  APP_DOMAIN: string;
  ENVIRONMENT: 'development' | 'production' | 'test';
} 