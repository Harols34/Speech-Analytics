
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAccount } from "@/context/AccountContext";
import { useAuth } from "@/context/AuthContext";

export interface Behavior {
  id: string;
  name: string;
  description?: string;
  prompt: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  account_id?: string;
  user_id?: string;
}

export function useBehaviors() {
  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [loading, setLoading] = useState(false);
  const { selectedAccountId } = useAccount();
  const { user } = useAuth();

  const fetchBehaviors = useCallback(async () => {
    try {
      setLoading(true);
      console.log("Fetching behaviors with account filter:", selectedAccountId, "user:", user?.id);
      
      let query = supabase
        .from("behaviors")
        .select("*")
        .order("updated_at", { ascending: false });

      // Show behaviors that are either:
      // 1. Created by the current user (user_id matches)
      // 2. Associated with the selected account (if account is selected and user has access)
      // 3. Global behaviors (no user_id and no account_id)
      
      if (selectedAccountId && selectedAccountId !== 'all') {
        console.log("Filtering behaviors by account:", selectedAccountId, "and user:", user?.id);
        query = query.or(`account_id.eq.${selectedAccountId},user_id.eq.${user?.id},and(user_id.is.null,account_id.is.null)`);
      } else {
        // Show user's personal behaviors and global behaviors
        query = query.or(`user_id.eq.${user?.id},and(user_id.is.null,account_id.is.null)`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      console.log("Behaviors fetched:", data?.length || 0);
      setBehaviors(data || []);
    } catch (error) {
      console.error("Error fetching behaviors:", error);
      toast.error("Error al cargar los comportamientos");
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId, user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchBehaviors();
    }
  }, [fetchBehaviors, user?.id]);

  const createBehavior = async (behaviorData: Omit<Behavior, "id" | "created_at" | "updated_at">) => {
    try {
      const newBehavior = {
        ...behaviorData,
        account_id: selectedAccountId && selectedAccountId !== 'all' ? selectedAccountId : null,
        user_id: user?.id || null
      };
      
      const { data, error } = await supabase
        .from("behaviors")
        .insert([newBehavior])
        .select();
      
      if (error) throw error;
      
      await fetchBehaviors();
      return data?.[0] as Behavior;
    } catch (error) {
      console.error("Error creating behavior:", error);
      throw error;
    }
  };

  const updateBehavior = async (id: string, updates: Partial<Behavior>) => {
    try {
      const { data, error } = await supabase
        .from("behaviors")
        .update(updates)
        .eq("id", id)
        .select();
      
      if (error) throw error;
      
      await fetchBehaviors();
      return data?.[0] as Behavior;
    } catch (error) {
      console.error("Error updating behavior:", error);
      throw error;
    }
  };

  const deleteBehavior = async (id: string) => {
    try {
      const { error } = await supabase
        .from("behaviors")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      await fetchBehaviors();
    } catch (error) {
      console.error("Error deleting behavior:", error);
      throw error;
    }
  };

  return {
    behaviors,
    loading,
    createBehavior,
    updateBehavior,
    deleteBehavior,
    fetchBehaviors
  };
}
