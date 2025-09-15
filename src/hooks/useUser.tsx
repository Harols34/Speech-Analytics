
import React, { useContext, createContext, useState, useEffect, ReactNode } from "react";
import { User } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
}

const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: false,
  error: null,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        setIsLoading(true);
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }
        
        if (!session) {
          setUser(null);
          setIsLoading(false);
          return;
        }
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }
        
        const userData: User = {
          id: session.user.id,
          email: session.user.email || "",
          name: profile?.full_name || session.user.user_metadata?.full_name || "",
          full_name: profile?.full_name || session.user.user_metadata?.full_name || "",
          role: (profile?.role as User["role"]) || "agent",
          avatar: profile?.avatar_url,
          avatar_url: profile?.avatar_url,
          dailyQueryLimit: 20,
          queriesUsed: 0,
          language: (profile?.language as User["language"]) || "es",
        };
        
        setUser(userData);
      } catch (err) {
        console.error("Error loading user:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          loadUser();
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, isLoading, error }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
