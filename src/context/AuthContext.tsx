
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { Session, User } from '@supabase/supabase-js';
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User as AppUser } from "@/lib/types";
import { toast } from "sonner";
import { cleanupAuthState, performGlobalSignOut } from "@/utils/authCleanup";

// Define the context type
type AuthContextType = {
  session: Session | null;
  user: AppUser | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  userRole: string | undefined;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserSession: () => Promise<void>;
  setUser: (user: AppUser | null) => void;
  setSession: (session: Session | null) => void;
  updateUser: (userData: Partial<AppUser>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Helper function to validate language
  const validateLanguage = useCallback((lang: string | null | undefined): 'es' | 'en' => {
    return (lang === 'es' || lang === 'en') ? lang : 'es';
  }, []);

  // Create fallback user for offline or error scenarios
  const createFallbackUser = useCallback((userId: string, currentSession: Session): AppUser => {
    const userEmail = currentSession.user?.email || 'usuario@example.com';
    console.log("Creating fallback user for:", userEmail);
    
    return {
      id: userId,
      email: userEmail,
      role: 'agent' as AppUser["role"],
      name: userEmail.split('@')[0] || 'Usuario',
      full_name: userEmail.split('@')[0] || 'Usuario',
      avatar: null,
      avatar_url: null,
      language: 'es' as const,
      dailyQueryLimit: 20,
      queriesUsed: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }, []);

  // Optimized user data fetching with timeout and better error handling
  const fetchUserData = useCallback(async (userId: string, currentSession: Session): Promise<AppUser> => {
    try {
      console.log("Fetching user data for ID:", userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching user profile:", error);
        return createFallbackUser(userId, currentSession);
      }
      
      if (!data) {
        console.log("No profile found, creating fallback");
        return createFallbackUser(userId, currentSession);
      }
      
      return {
        id: userId,
        email: currentSession.user?.email || '',
        role: data.role as AppUser["role"],
        name: data.full_name || '',
        full_name: data.full_name || '',
        avatar: data.avatar_url,
        avatar_url: data.avatar_url,
        language: validateLanguage(data.language),
        dailyQueryLimit: 20,
        queriesUsed: 0,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error("Error in fetchUserData:", error);
      return createFallbackUser(userId, currentSession);
    }
  }, [createFallbackUser, validateLanguage]);

  // Initialize auth
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log("Initializing auth...");
        
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (initialSession?.user) {
          console.log("Initial session found");
          setSession(initialSession);
          
          try {
            const userData = await fetchUserData(initialSession.user.id, initialSession);
            if (mounted) {
              setUser(userData);
            }
          } catch (error) {
            console.error("Failed to fetch user data during init:", error);
            if (mounted) {
              setUser(createFallbackUser(initialSession.user.id, initialSession));
            }
          }
        }
        
        if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log("Auth event:", event);

        if (!mounted) return;

        switch (event) {
          case 'SIGNED_OUT':
            setSession(null);
            setUser(null);
            setLoading(false);
            break;
            
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
            if (currentSession?.user) {
              console.log("Setting session for user:", currentSession.user.id);
              setSession(currentSession);
              
              // Defer data fetching to prevent issues
              setTimeout(async () => {
                try {
                  const userData = await fetchUserData(currentSession.user.id, currentSession);
                  if (mounted) {
                    setUser(userData);
                  }
                } catch (error) {
                  console.error("Failed to fetch user data on auth change:", error);
                  if (mounted) {
                    setUser(createFallbackUser(currentSession.user.id, currentSession));
                  }
                }
              }, 0);
            }
            setLoading(false);
            break;
            
          default:
            setLoading(false);
            break;
        }
      }
    );

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData, createFallbackUser]);

  // Enhanced sign-in function with better error handling
  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    
    try {
      console.log("Starting sign in process for:", email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Sign in error:", error);
        throw error;
      }
      
      if (data.session) {
        console.log("Sign in successful for:", email);
      }
    } catch (error: any) {
      console.error("Sign in failed:", error);
      setLoading(false);
      throw error;
    }
  }, []);

  // Enhanced sign-out function
  const signOut = useCallback(async () => {
    try {
      console.log("Starting sign out process...");
      
      // Clean up state immediately
      setSession(null);
      setUser(null);
      
      // Clean up storage
      cleanupAuthState();
      
      // Attempt global sign out
      await performGlobalSignOut(supabase);
      
      // Force navigation to login
      window.location.href = '/login';
    } catch (error) {
      console.error("Error during sign out:", error);
      // Force navigation even if sign out fails
      window.location.href = '/login';
    }
  }, []);

  // Refresh session function
  const refreshUserSession = useCallback(async () => {
    try {
      console.log("Refreshing user session");
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error("Error refreshing session:", error);
        // If refresh fails, clean up and redirect to login
        cleanupAuthState();
        navigate('/login');
        return;
      }
      
      if (data.session) {
        console.log("Session refreshed successfully");
        setSession(data.session);
      }
    } catch (error) {
      console.error("Unexpected error refreshing session:", error);
      cleanupAuthState();
      navigate('/login');
    }
  }, [navigate]);

  // Update user data function
  const updateUser = useCallback(async (userData: Partial<AppUser>) => {
    try {
      if (!user || !user.id) {
        throw new Error("No authenticated user");
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(userData)
        .eq('id', user.id);
        
      if (error) throw error;
      
      setUser({ ...user, ...userData });
      toast.success("Perfil actualizado correctamente");
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Error al actualizar el perfil");
      throw error;
    }
  }, [user]);

  // Alias methods
  const login = signIn;
  const logout = signOut;

  // Calculate derived values
  const isAuthenticated = !!session && !!user;
  const userRole = user?.role;

  // Create optimized context value
  const contextValue = useMemo(
    () => ({
      session,
      user,
      isAuthenticated,
      signIn,
      signOut,
      loading,
      userRole,
      login,
      logout,
      refreshUserSession,
      setUser,
      setSession,
      updateUser,
    }),
    [session, user, loading, userRole, signIn, signOut, refreshUserSession, updateUser]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
