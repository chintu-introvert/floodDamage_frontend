import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

export type UserRole = 'admin' | 'surveyor';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize and restore session on load
  useEffect(() => {
    const initializeAuth = () => {
      const token = localStorage.getItem('floodsync_token');
      const activeSession = localStorage.getItem('floodsync_session');
      
      if (token && activeSession) {
        // Set token in global axios headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          setUser(JSON.parse(activeSession));
        } catch (e) {
          console.error('Failed to parse cached session:', e);
          localStorage.removeItem('floodsync_token');
          localStorage.removeItem('floodsync_session');
          delete axios.defaults.headers.common['Authorization'];
          setUser(null);
        }
      } else {
        localStorage.removeItem('floodsync_token');
        localStorage.removeItem('floodsync_session');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await axios.post('/api/auth/login', { email, password });
      const { token, user: loggedUser } = res.data;

      localStorage.setItem('floodsync_token', token);
      localStorage.setItem('floodsync_session', JSON.stringify(loggedUser));
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(loggedUser);
      setIsLoading(false);
      return true;
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'An unexpected error occurred during login';
      setError(errMsg);
      setIsLoading(false);
      return false;
    }
  };

  const register = async (username: string, email: string, password: string, role: UserRole): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await axios.post('/api/auth/register', { username, email, password, role });
      const { token, user: newUser } = res.data;

      localStorage.setItem('floodsync_token', token);
      localStorage.setItem('floodsync_session', JSON.stringify(newUser));
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(newUser);
      setIsLoading(false);
      return true;
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'An unexpected error occurred during registration';
      setError(errMsg);
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('floodsync_token');
    localStorage.removeItem('floodsync_session');
    delete axios.defaults.headers.common['Authorization'];
  };

  const clearError = () => setError(null);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
