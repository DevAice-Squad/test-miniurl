import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';
import apiService from '../services/api';
import { User, AuthContextType, LoginRequest, RegisterRequest, ChangePasswordRequest } from '../types';

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is authenticated on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('auth_token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          // Parse saved user data
          const userData = JSON.parse(savedUser);
          setUser(userData);

          // Verify token is still valid by fetching fresh profile
          const { user: freshUser } = await apiService.getProfile();
          setUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
        } catch (error) {
          // Token is invalid, clear stored data
          console.error('Token validation failed:', error);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginRequest): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await apiService.login(credentials);
      
      // Store token and user data
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      setUser(response.user);
      
      toast.success('Login successful!');
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || 'Login failed';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterRequest): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await apiService.register(data);
      
      // Store token and user data
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      setUser(response.user);
      
      toast.success('Registration successful!');
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.message || 'Registration failed';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    // Clear stored data
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    setUser(null);
    
    toast.success('Logged out successfully');
  };

  const updateProfile = async (data: Partial<User>): Promise<void> => {
    try {
      const response = await apiService.updateProfile(data);
      
      // Update user state and localStorage
      setUser(response.user);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Profile update error:', error);
      const errorMessage = error.response?.data?.message || 'Profile update failed';
      toast.error(errorMessage);
      throw error;
    }
  };

  const changePassword = async (data: ChangePasswordRequest): Promise<void> => {
    try {
      await apiService.changePassword(data);
      toast.success('Password changed successfully');
    } catch (error: any) {
      console.error('Password change error:', error);
      const errorMessage = error.response?.data?.message || 'Password change failed';
      toast.error(errorMessage);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 