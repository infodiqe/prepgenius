"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getProfile, logout as apiLogout } from "./authService";
import { paths } from "@/lib/api/types";

type UserProfile = paths["/api/v1/auth/profile/"]["get"]["responses"]["200"]["content"]["application/json"];

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialUser?: UserProfile | null;
}) {
  const [user, setUser] = useState<UserProfile | null>(initialUser);
  const [isLoading, setIsLoading] = useState(!initialUser);

  const refreshProfile = async (): Promise<UserProfile | null> => {
    try {
      setIsLoading(true);
      const profile = await getProfile();
      setUser(profile);
      return profile;
    } catch (error) {
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialUser) {
      refreshProfile();
    }
  }, [initialUser]);

  const logout = async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      setUser(null);
      // Force reload to clear client router cache and redirect
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
