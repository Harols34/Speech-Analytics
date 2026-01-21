
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useAccount } from '@/context/AccountContext';
import { toast } from 'sonner';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  user_id?: string;
  timestamp?: string;
  metadata?: {
    statistics?: any[];
    relevant_calls?: any[];
    show_call_details?: boolean;
    query_type?: 'topics' | 'general';
    expanded_topics?: string[];
  };
}

export function useVectorizedChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { selectedAccountId } = useAccount();

  const loadChatHistory = useCallback(async () => {
    if (!selectedAccountId || selectedAccountId === 'all') {
      setMessages([]);
      return;
    }

    try {
      console.log('ChatInterface: Loading SHARED chat history for account', selectedAccountId);
      
      // Cargar historial compartido para toda la cuenta (sin filtrar por user_id)
      const { data: chatHistory, error } = await supabase
        .from('chat_messages')
        .select('role, content, timestamp, user_id')
        .eq('account_id', selectedAccountId)
        // NO filtrar por user_id para que sea compartido para toda la cuenta
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error loading chat history:', error);
        return;
      }

      if (chatHistory && chatHistory.length > 0) {
        const formattedMessages: ChatMessage[] = chatHistory.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: msg.timestamp,
          user_id: msg.user_id
        }));
        
        setMessages(formattedMessages);
        console.log(`ChatInterface: SHARED chat history loaded: ${chatHistory.length} messages for account ${selectedAccountId}`);
      } else {
        setMessages([]);
        console.log('ChatInterface: No chat history found');
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }, [selectedAccountId]); // Removed user dependency to make it shared

  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);

  const saveChatMessage = useCallback(async (role: 'user' | 'assistant', content: string, metadata?: any) => {
    if (!selectedAccountId || selectedAccountId === 'all' || !user?.id) return;

    try {
      console.log(`ChatInterface: Saving ${role} message for SHARED account ${selectedAccountId}`);
      
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          role,
          content,
          user_id: user.id, // Mantener user_id para auditoría pero no usar en filtros
          account_id: selectedAccountId
        });

      if (error) {
        console.error('Error saving chat message:', error);
      } else {
        console.log('ChatInterface: Chat message saved successfully');
      }
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
  }, [user, selectedAccountId]);

  const sendMessage = useCallback(async (message: string) => {
    if (!user || !message.trim() || !selectedAccountId || selectedAccountId === 'all') {
      console.error('Cannot send message: missing user, message, or valid account');
      return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: message.trim(),
      user_id: user.id,
      timestamp: new Date().toISOString()
    };

    // Actualizar inmediatamente el estado local
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Guardar mensaje del usuario
      await saveChatMessage('user', message.trim());

      console.log('Enviando mensaje al chatbot:', message);
      console.log('Account ID:', selectedAccountId);
      console.log('Chat history length:', messages.length);

      // Preparar historial completo para el contexto (incluir el nuevo mensaje del usuario)
      const fullChatHistory = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const { data, error } = await supabase.functions.invoke('general-chat', {
        body: {
          message: message.trim(),
          accountId: selectedAccountId,
          chatHistory: fullChatHistory
        }
      });

      if (error) {
        console.error('Error en función general-chat:', error);
        throw error;
      }

      console.log('Respuesta del chatbot:', data);

      // Verificar que la respuesta esté completa
      let responseContent = data.response;
      if (!responseContent || responseContent.length < 10) {
        throw new Error('Respuesta del chatbot incompleta o vacía');
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: responseContent,
        metadata: data.metadata,
        timestamp: new Date().toISOString()
      };

      // Actualizar estado local con la respuesta
      setMessages(prev => [...prev, assistantMessage]);
      
      // Guardar respuesta del asistente
      await saveChatMessage('assistant', responseContent);

      // Registrar uso si hay account_id
      if (selectedAccountId && selectedAccountId !== 'all') {
        try {
          await supabase.rpc('register_usage_v2', {
            p_account_id: selectedAccountId,
            p_tipo: 'chat',
            p_cantidad: 1,
            p_subtipo: 'chat_general',
            p_modelo_openai: 'gpt-4o-mini',
            p_tokens_used: Math.floor(message.length / 4) + Math.floor(responseContent.length / 4)
          });
        } catch (usageError) {
          console.warn('Error registrando uso:', usageError);
        }
      }

    } catch (error: any) {
      console.error('Error sending message:', error);
      
      let errorMessage = 'Hubo un error al procesar tu mensaje.';
      
      if (error.message?.includes('límite')) {
        errorMessage = error.message;
      } else if (error.message?.includes('OpenAI')) {
        errorMessage = 'Error de conexión con el servicio de AI. Intenta nuevamente.';
      } else if (error.name === 'FunctionsFetchError') {
        errorMessage = 'Error de conexión con el servidor. Verifica tu conexión a internet e intenta nuevamente.';
      } else if (error.message?.includes('incompleta')) {
        errorMessage = 'La respuesta del sistema fue incompleta. Intenta hacer la pregunta nuevamente con más detalles.';
      }

      toast.error(errorMessage);
      
      const errorAssistantMessage: ChatMessage = {
        role: 'assistant',
        content: `Lo siento, ${errorMessage}. Por favor, intenta nuevamente reformulando tu pregunta o siendo más específico en lo que necesitas saber.`
      };

      setMessages(prev => [...prev, errorAssistantMessage]);
      await saveChatMessage('assistant', `Lo siento, ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedAccountId, messages, saveChatMessage]);

  const clearMessages = useCallback(async () => {
    setMessages([]);
    
    if (selectedAccountId && selectedAccountId !== 'all' && user?.id) {
      try {
        // Limpiar TODO el historial de la cuenta (compartido)
        await supabase
          .from('chat_messages')
          .delete()
          .eq('account_id', selectedAccountId);
          // No filtrar por user_id para limpiar todo el historial compartido
      } catch (error) {
        console.error('Error clearing chat history from DB:', error);
      }
    }
  }, [user, selectedAccountId]);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    loadChatHistory
  };
}
