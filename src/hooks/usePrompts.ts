
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAccount } from "@/context/AccountContext";
import { useAuth } from "@/context/AuthContext";

export type PromptType = "summary" | "feedback";

export interface Prompt {
  id: string;
  name: string;
  content: string;
  type: PromptType;
  active: boolean;
  updated_at: string;
  account_id?: string;
  user_id?: string;
}

export function usePrompts(type?: PromptType) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(false);
  const { selectedAccountId } = useAccount();
  const { user } = useAuth();
  
  const lastFetchRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPrompts = useCallback(async () => {
    if (!type || !user?.id) return;
    
    const fetchKey = `${type}-${selectedAccountId}-${user.id}`;
    
    if (lastFetchRef.current === fetchKey) {
      return;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    
    try {
      setLoading(true);
      console.log("Fetching prompts for type:", type, "account:", selectedAccountId, "user:", user?.id);
      
      let query = supabase
        .from("prompts")
        .select("*")
        .eq("type", type)
        .order("updated_at", { ascending: false });

      // Filtro corregido para prompts por cuenta
      if (selectedAccountId && selectedAccountId !== 'all') {
        console.log("Filtering prompts STRICTLY by account:", selectedAccountId);
        query = query.eq('account_id', selectedAccountId);
      } else if (selectedAccountId === 'all' && user.role === 'superAdmin') {
        // Superadmin con "all" ve todos los prompts
        console.log("SuperAdmin viewing all prompts");
        // No agregar filtros adicionales - mostrar todos los prompts
      } else {
        // Usuario normal sin cuenta específica - solo prompts personales
        console.log("Filtering prompts for user personal prompts only");
        query = query.eq('user_id', user?.id).is('account_id', null);
      }

      const { data, error } = await query.abortSignal(abortControllerRef.current.signal);

      if (error) {
        if (error.message.includes('aborted')) {
          console.log('Prompts request was aborted');
          return;
        }
        throw error;
      }
      
      if (data) {
        const typedPrompts = data.map(prompt => ({
          ...prompt,
          type: prompt.type as PromptType
        }));
        console.log("Prompts fetched for account", selectedAccountId, ":", typedPrompts.length);
        setPrompts(typedPrompts);
        lastFetchRef.current = fetchKey;
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return;
      }
      console.error("Error fetching prompts:", error);
      toast.error("Error al cargar los prompts");
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [type, selectedAccountId, user?.id, user?.role]);

  useEffect(() => {
    if (type && user?.id) {
      const timeoutId = setTimeout(fetchPrompts, 100);
      return () => clearTimeout(timeoutId);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [type, selectedAccountId, user?.id]);

  const activePrompt = prompts.find((p) => p.active);

  const createPrompt = async (p: Omit<Prompt, "id" | "updated_at">) => {
    try {
      const promptData = {
        ...p,
        account_id: selectedAccountId && selectedAccountId !== 'all' ? selectedAccountId : null,
        user_id: user?.id || null
      };
      
      const { data, error } = await supabase.from("prompts").insert([promptData]).select();
      
      if (error) throw error;
      
      lastFetchRef.current = '';
      await fetchPrompts();
      return data?.[0] as Prompt;
    } catch (error) {
      console.error("Error creating prompt:", error);
      throw error;
    }
  };

  const updatePrompt = async (id: string, updates: Partial<Prompt>) => {
    try {
      const { data, error } = await supabase.from("prompts").update(updates).eq("id", id).select();
      
      if (error) throw error;
      
      lastFetchRef.current = '';
      await fetchPrompts();
      return data?.[0] as Prompt;
    } catch (error) {
      console.error("Error updating prompt:", error);
      throw error;
    }
  };

  const togglePromptActive = async (promptId: string) => {
    try {
      const deactivateQuery = supabase.from("prompts").update({ active: false }).eq("type", type!);
      
      if (selectedAccountId && selectedAccountId !== 'all') {
        deactivateQuery.eq('account_id', selectedAccountId);
      } else if (selectedAccountId === 'all' && user?.role === 'superAdmin') {
        // Superadmin: desactivar todos los prompts del tipo
      } else {
        deactivateQuery.eq('user_id', user?.id).is('account_id', null);
      }
      
      await deactivateQuery;
      
      const { error } = await supabase.from("prompts").update({ active: true }).eq("id", promptId);
      
      if (error) throw error;
      
      lastFetchRef.current = '';
      await fetchPrompts();
      return true;
    } catch (error) {
      console.error("Error toggling prompt active state:", error);
      throw error;
    }
  };

  return {
    prompts,
    loading,
    activePrompt,
    createPrompt,
    updatePrompt,
    togglePromptActive,
    fetchPrompts
  };
}
