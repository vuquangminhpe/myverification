"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { storeAuthToken, getAuthToken, removeAuthToken } from "../user.api";
import type { User } from "../User.type";

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = () => {
      const token = getAuthToken();
      const savedUserData = localStorage.getItem("userData");
      
      if (token && savedUserData) {
        try {
          const userData = JSON.parse(savedUserData);
          setIsAuthenticated(true);
          setUser(userData);
        } catch (error) {
          console.error("Error parsing saved user data:", error);
          // Clear invalid data
          removeAuthToken();
          localStorage.removeItem("userData");
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = (userData: User, token: string) => {
    setIsAuthenticated(true);
    setUser(userData);
    storeAuthToken(token);
    localStorage.setItem("userData", JSON.stringify(userData));
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    removeAuthToken();
    localStorage.removeItem("userData");
  };

  const value: AuthContextType = {
    isAuthenticated,
    user,
    login,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};