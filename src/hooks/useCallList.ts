
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import { toast } from "sonner";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export interface Call {
  id: string;
  title: string;
  agent_name: string;
  date: string;
  duration: number;
  status: "pending" | "transcribing" | "analyzing" | "complete" | "error";
  sentiment?: string;
  result?: "" | "venta" | "no venta";
  product?: "" | "fijo" | "móvil";
  reason?: string;
  account_id?: string;
  agent_id?: string;
  audio_url: string;
  transcription?: string;
  summary?: string;
  created_at: string;
  updated_at: string;
  filename: string;
  agentName: string;
  progress: number;
  audioUrl: string;
}

export function useCallList() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCalls, setSelectedCalls] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const { user, session } = useAuth();
  const { selectedAccountId } = useAccount();
  
  // Prevent multiple concurrent requests
  const isLoadingRef = useRef(false);
  const lastFetchParamsRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadCalls = useCallback(async (filters?: any, forceRefresh?: boolean) => {
    if (!session || !user) {
      setLoading(false);
      return;
    }

    // Create a unique identifier for this fetch request
    const fetchParams = `${user.id}-${user.role}-${selectedAccountId}`;
    
    // Skip if already loading the same data (unless forced)
    if (!forceRefresh && (isLoadingRef.current || lastFetchParamsRef.current === fetchParams)) {
      return;
    }

    // Prevent concurrent requests
    if (isLoadingRef.current && !forceRefresh) {
      console.log("Skipping duplicate call load request");
      return;
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    isLoadingRef.current = true;

    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      console.log("Loading calls for user:", user.role, "selected account:", selectedAccountId);
      
      let query = supabase
        .from('calls')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500); // Aumentado para cargas masivas

      // Apply account filter for ALL roles
      if (selectedAccountId && selectedAccountId !== 'all') {
        console.log("Filtering by account:", selectedAccountId);
        query = query.eq('account_id', selectedAccountId);
      }

      // Only apply agent filter if user is 'agent'
      if (user.role === 'agent') {
        console.log("Agent filter applied - only showing calls for agent:", user.id);
        query = query.eq('agent_id', user.id);
      }

      // Apply dynamic filters if provided
      if (filters) {
        // Status
        if (Array.isArray(filters.status) && filters.status.length > 0) {
          query = query.in('status', filters.status);
        }
        // Sentiment
        if (Array.isArray(filters.sentiment) && filters.sentiment.length > 0) {
          query = query.in('sentiment', filters.sentiment);
        }
        // Result
        if (Array.isArray(filters.result) && filters.result.length > 0) {
          query = query.in('result', filters.result);
        }
        // Product
        if (Array.isArray(filters.product) && filters.product.length > 0) {
          query = query.in('product', filters.product);
        }
        // Agent
        if (Array.isArray(filters.agent) && filters.agent.length > 0) {
          query = query.in('agent_id', filters.agent);
        }
        // Date range quick filters
        if (filters.dateRange && filters.dateRange !== 'all') {
          let from: Date; let to: Date;
          if (filters.dateRange === 'today') {
            from = startOfDay(new Date());
            to = endOfDay(new Date());
          } else if (filters.dateRange === 'week') {
            from = startOfWeek(new Date(), { weekStartsOn: 1 });
            to = endOfWeek(new Date(), { weekStartsOn: 1 });
          } else if (filters.dateRange === 'month') {
            from = startOfMonth(new Date());
            to = endOfMonth(new Date());
          } else {
            from = new Date(0);
            to = new Date();
          }
          query = query.gte('created_at', from.toISOString()).lte('created_at', to.toISOString());
        }
        // Query text (title, agent_name, summary)
        if (filters.query && String(filters.query).trim().length > 0) {
          const q = String(filters.query).trim();
          const like = `%${q}%`;
          // Supabase OR syntax: field.ilike.value
          query = query.or(`title.ilike.${like},agent_name.ilike.${like},summary.ilike.${like}`);
        }
      }

      const { data, error: callsError } = await query.abortSignal(abortControllerRef.current.signal);

      if (callsError) {
        if (callsError.name === 'AbortError') {
          console.log('Request was aborted');
          return;
        }
        throw callsError;
      }

      console.log("Raw calls data from DB:", data?.length || 0, "calls found");
      
      // Transform data to match expected interface
      const transformedCalls = (data || []).map(call => ({
        ...call,
        filename: call.title || 'Unknown',
        agentName: call.agent_name || 'Unknown',
        progress: call.status === 'complete' ? 100 : 
                 call.status === 'analyzing' ? 75 :
                 call.status === 'transcribing' ? 50 : 
                 call.status === 'error' ? 0 : 25,
        audioUrl: call.audio_url || '',
        audio_url: call.audio_url || '',
        status: call.status as "pending" | "transcribing" | "analyzing" | "complete" | "error",
        result: (call.result === "venta" || call.result === "no venta" || call.result === "") ? 
                call.result as "" | "venta" | "no venta" : 
                undefined,
        product: (call.product === "fijo" || call.product === "móvil" || call.product === "") ? 
                 call.product as "" | "fijo" | "móvil" : 
                 undefined,
      })) as Call[];
      
      console.log("Transformed calls ready to display:", transformedCalls.length);
      setCalls(transformedCalls);
      lastFetchParamsRef.current = fetchParams; // Mark this fetch as completed
      
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      console.error("Error fetching calls:", err);
      setError(err.message || "Error al cargar las llamadas");
      
      if (!err.message?.includes('timeout')) {
        toast.error("Error al cargar las llamadas");
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      isLoadingRef.current = false;
      abortControllerRef.current = null;
    }
  }, [session, user, selectedAccountId]);

  const fetchCalls = useCallback((filters?: any, forceRefresh?: boolean) => {
    loadCalls(filters, forceRefresh);
  }, [loadCalls]);

  const handleRefresh = useCallback(() => {
    lastFetchParamsRef.current = ''; // Reset to force refresh
    isLoadingRef.current = false;
    loadCalls(undefined, true);
  }, [loadCalls]);

  const deleteCall = async (callId: string) => {
    try {
      console.log('🗑️ Deleting call:', callId);
      
      const { data, error } = await supabase.rpc('delete_call_with_messages', {
        call_id_param: callId
      });

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }
      
      if (!data) {
        console.error('❌ Function returned false');
        throw new Error("Error al eliminar la llamada - operación falló");
      }

      console.log('✅ Call deleted successfully');
      toast.success("Llamada eliminada exitosamente");
      
      // Refresh data
      lastFetchParamsRef.current = '';
      isLoadingRef.current = false;
      loadCalls();
    } catch (err: any) {
      console.error("❌ Error deleting call:", err);
      toast.error("Error al eliminar la llamada", {
        description: err.message || "Error desconocido"
      });
    }
  };

  const deleteMultipleCalls = async () => {
    try {
      console.log('🗑️ Deleting multiple calls:', selectedCalls.length);
      
      const { data, error } = await supabase.rpc('delete_multiple_calls', {
        call_ids: selectedCalls
      });

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }
      
      if (!data) {
        console.error('❌ Function returned false');
        throw new Error("Error al eliminar las llamadas - operación falló");
      }

      console.log('✅ Multiple calls deleted successfully');
      toast.success(`${selectedCalls.length} llamadas eliminadas exitosamente`);
      
      setSelectedCalls([]);
      setMultiSelectMode(false);
      
      // Refresh data
      lastFetchParamsRef.current = '';
      isLoadingRef.current = false;
      loadCalls();
    } catch (err: any) {
      console.error("❌ Error deleting multiple calls:", err);
      toast.error("Error al eliminar las llamadas", {
        description: err.message || "Error desconocido"
      });
    }
  };

  const cleanPlatform = async () => {
    try {
      console.log('🧹 Cleaning platform...');
      
      const { data, error } = await supabase.rpc('clean_platform');

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }
      
      if (!data) {
        console.error('❌ Function returned false');
        throw new Error("Error al limpiar la plataforma - operación falló");
      }

      console.log('✅ Platform cleaned successfully');
      toast.success("Plataforma limpiada exitosamente");
      
      // Reset all state
      setCalls([]);
      setSelectedCalls([]);
      setMultiSelectMode(false);
      
      // Refresh data
      lastFetchParamsRef.current = '';
      isLoadingRef.current = false;
      loadCalls();
    } catch (err: any) {
      console.error("❌ Error cleaning platform:", err);
      toast.error("Error al limpiar la plataforma", {
        description: err.message || "Verifica que tengas permisos de superAdmin"
      });
    }
  };

  const toggleCallSelection = (callId: string) => {
    setSelectedCalls(prev => 
      prev.includes(callId) 
        ? prev.filter(id => id !== callId)
        : [...prev, callId]
    );
  };

  const toggleAllCalls = () => {
    if (selectedCalls.length === calls.length) {
      setSelectedCalls([]);
    } else {
      setSelectedCalls(calls.map(call => call.id));
    }
  };

  // Debounced effect to prevent rapid successive calls
  useEffect(() => {
    if (user && session) {
      console.log("Effect triggered - loading calls with account:", selectedAccountId);
      // Debounce to prevent rapid successive calls
      const timeoutId = setTimeout(() => {
        if (!isLoadingRef.current) {
          loadCalls();
        }
      }, 300);
      return () => clearTimeout(timeoutId);
    }

    // Cleanup function to abort any pending requests
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      isLoadingRef.current = false;
    };
  }, [user?.id, selectedAccountId]); // Only depend on essential parameters

  const refreshCalls = useCallback(() => {
    lastFetchParamsRef.current = ''; // Reset to force refresh
    isLoadingRef.current = false;
    loadCalls();
  }, [loadCalls]);

  return {
    calls,
    loading,
    error,
    selectedCalls,
    isRefreshing,
    multiSelectMode,
    setMultiSelectMode,
    fetchCalls,
    handleRefresh,
    deleteCall,
    deleteMultipleCalls,
    toggleCallSelection,
    toggleAllCalls,
    refreshCalls,
    cleanPlatform,
    isLoading: loading,
  };
}
