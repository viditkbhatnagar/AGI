import { createContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest } from './queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

type User = {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'student';
};

type Student = {
  id: string;
  name: string;
  pathway: 'standalone' | 'with-mba';
  // other student properties
};

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  student: Student | null;
  userRole: 'admin' | 'student' | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'student' | null>(null);
  
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      
      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        });
        
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          setStudent(data.student || null);
          setUserRole(data.role);
          setIsAuthenticated(true);
        } else {
          // Token is invalid, remove it
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      const response = await apiRequest('POST', '/api/auth/login', { email, password });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle suspended account
        if (response.status === 403 && errorData.suspended) {
          toast({
            title: "Account Suspended",
            description: errorData.message,
            variant: "destructive",
          });
          throw new Error(errorData.message);
        }
        
        // Handle other errors
        throw new Error(errorData.message || 'Login failed');
      }
      
      const data = await response.json();
      
      // Save token to localStorage
      localStorage.setItem('token', data.token);
      
      // Update state
      setUser(data);
      setStudent(data.student || null);
      setUserRole(data.role);
      setIsAuthenticated(true);
      
      // Redirect based on role
      if (data.role === 'admin') {
        setLocation('/admin');
      } else {
        setLocation('/student');
      }
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.username}!`,
      });
    } catch (error) {
      console.error('Login error:', error);
      
      // If it's not already a suspended account error, show generic error
      if (!error.message.includes('suspended') && !error.message.includes('payment')) {
        toast({
          title: "Login failed",
          description: "Invalid email or password",
          variant: "destructive",
        });
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Remove token from localStorage
    localStorage.removeItem('token');
    
    // Update state
    setUser(null);
    setStudent(null);
    setUserRole(null);
    setIsAuthenticated(false);
    
    // Redirect to login
    setLocation('/login');
    
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
  };

  const value = {
    isAuthenticated,
    isLoading,
    user,
    student,
    userRole,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Helper hook to access auth context
import { useContext } from 'react';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}