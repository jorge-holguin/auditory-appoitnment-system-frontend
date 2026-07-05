import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken, refreshToken, setAuthToken, removeAuthToken, getCurrentUser, isTokenExpired, type UserInfo } from '@/lib/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (token: string, primerInicio: boolean) => void;
  logout: () => void;
  refreshUserToken: () => Promise<boolean>;
  loading: boolean;
  user: UserInfo | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken();
      if (token) {
        // Check if token is expired
        if (isTokenExpired(token)) {
          // Try to refresh token
          const newToken = await refreshToken(token);
          if (newToken) {
            setAuthToken(newToken);
            setIsAuthenticated(true);
            const userInfo = getCurrentUser();
            setUser(userInfo);
          } else {
            // Token expired and refresh failed, logout
            removeAuthToken();
            setIsAuthenticated(false);
            setUser(null);
          }
        } else {
          setIsAuthenticated(true);
          // Get user info from token
          const userInfo = getCurrentUser();
          setUser(userInfo);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = (token: string, _primerInicio: boolean) => {
    setAuthToken(token);
    setIsAuthenticated(true);
    
    // Get user info from token
    const userInfo = getCurrentUser();
    setUser(userInfo);
    
    // Redirect to consulta externa page (no password change implementation needed)
    navigate('/consulta-externa');
  };

  const logout = () => {
    removeAuthToken();
    setIsAuthenticated(false);
    setUser(null);
    navigate('/login');
  };

  const refreshUserToken = async (): Promise<boolean> => {
    const currentToken = getAuthToken();
    if (!currentToken) return false;

    const newToken = await refreshToken(currentToken);
    if (newToken) {
      setAuthToken(newToken);
      return true;
    }
    
    logout();
    return false;
  };

  const authContextValue = { isAuthenticated, login, logout, refreshUserToken, loading, user };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
