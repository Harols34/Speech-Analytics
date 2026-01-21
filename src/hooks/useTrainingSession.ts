import { useState, useCallback } from 'react';
import { TrainingScenario, TrainingMessage } from '@/lib/types/training';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAccount } from '@/context/AccountContext';

type SessionMode = 'chat' | 'voice';

export function useTrainingSession(scenario: TrainingScenario, mode: SessionMode) {
  const [messages, setMessages] = useState<TrainingMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [sessionSaved, setSessionSaved] = useState(false); // Track if session is already saved
  const { selectedAccountId } = useAccount();

  const startSession = useCallback(async () => {
    try {
      console.log('🚀 Starting training session:', { mode, scenarioId: scenario.id });
      
      setIsLoading(true);
      setSessionActive(true);
      setCurrentScore(0);
      setMessages([]);
      setSuggestions([]);
      setSessionSaved(false);
      
      // Generate session ID and timestamp
      const newSessionId = crypto.randomUUID();
      const startTime = new Date().toISOString();
      setSessionId(newSessionId);
      setStartedAt(startTime);

      // Create initial AI message
      const initialMessage: TrainingMessage = {
        id: crypto.randomUUID(),
        role: 'ai',
        content: generateInitialMessage(scenario),
        timestamp: startTime
      };

      setMessages([initialMessage]);
      
      // Add initial suggestions
      setSuggestions([
        'Saluda cordialmente y pregunta cómo puedes ayudar',
        'Escucha atentamente las necesidades del cliente',
        'Mantén un tono profesional y empático'
      ]);

      console.log('✅ Training session started:', { sessionId: newSessionId, mode });
      toast.success('Sesión de entrenamiento iniciada');
    } catch (error) {
      console.error('❌ Error starting session:', error);
      toast.error('Error al iniciar la sesión');
      setSessionActive(false);
    } finally {
      setIsLoading(false);
    }
  }, [scenario, mode]);

  const sendMessage = useCallback(async (content: string) => {
    if (!sessionActive || isLoading) return;

    console.log('📤 Sending message:', { content: content.substring(0, 50) + '...', mode });

    const userMessage: TrainingMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Check for consecutive messages (more than 3 in a row from same role)
    const lastMessages = [...messages, userMessage].slice(-4);
    const consecutiveCount = lastMessages.filter(m => m.role === 'user').length;
    
    if (consecutiveCount >= 3) {
      console.warn('⚠️ Detected 3+ consecutive user messages, ending session');
      toast.warning('Detectados múltiples mensajes seguidos. Finalizando sesión...');
      setIsLoading(false);
      setSessionActive(false);
      return;
    }

    try {
      // Build message history for AI
      const currentMessages = [...messages, userMessage];
      const history = currentMessages.map((m) => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }));

      // Map scenario for AI function
      const difficultyMap: Record<string, number> = {
        beginner: 1,
        intermediate: 3,
        advanced: 5,
      };

      const scenarioPayload = {
        id: scenario.id,
        title: scenario.name,
        description: scenario.description,
        scenario_type: scenario.category,
        prompt_instructions: scenario.context || buildScenarioContext(scenario),
        difficulty_level: difficultyMap[scenario.difficulty] ?? 3,
      };

      const knowledgeBase = (scenario as any).knowledge_documents?.map((doc: any) => ({
        title: typeof doc === 'string' ? doc : doc?.name ?? 'Documento',
        content: typeof doc === 'string' ? '' : (doc?.content_summary ?? ''),
        document_type: typeof doc === 'string' ? 'doc' : (doc?.type ?? 'doc'),
      })) ?? [];

      // Call AI function
      const { data, error } = await supabase.functions.invoke('enhanced-ai-conversation', {
        body: {
          messages: history,
          scenario: scenarioPayload,
          knowledgeBase,
          clientPersonality: scenario.client_personality?.type ?? 'neutral',
          evaluationMode: false,
        },
      });

      if (error) throw error;

      const aiText: string = data?.response ?? generateFallbackResponse(scenario.client_personality.type);

      const aiMessage: TrainingMessage = {
        id: crypto.randomUUID(),
        role: 'ai',
        content: aiText,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);

      // Check for consecutive AI messages
      const allMessages = [...messages, userMessage, aiMessage];
      const lastAIMessages = allMessages.slice(-4).filter(m => m.role === 'ai').length;
      
      if (lastAIMessages >= 3) {
        console.warn('⚠️ Detected 3+ consecutive AI messages, ending session');
        toast.warning('Detectados múltiples mensajes seguidos del asistente. Finalizando sesión...');
        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
        setSessionActive(false);
        return;
      }

      // Update score - now increases from 0 based on good responses
      const scoreChange = evaluateResponse(content, scenario);
      setCurrentScore(prev => Math.max(0, Math.min(100, prev + scoreChange)));

      // Add suggestions
      const newSuggestions = generateSuggestions(content, scenario, aiText);
      if (newSuggestions.length > 0) {
        setSuggestions(prev => [...prev, ...newSuggestions]);
      }

      // For chat mode: save after first exchange, then keep updating every turn
      const updatedMessages = [...messages, userMessage, aiMessage];
      if (mode === 'chat' && !sessionSaved && messages.length === 1) {
        console.log('💾 Saving chat session after first exchange');
        await saveTrainingSession(updatedMessages, false);
        setSessionSaved(true);
      } else if (mode === 'chat' && sessionSaved) {
        console.log('💾 Updating chat session with new messages');
        await saveTrainingSession(updatedMessages, false);
      }

    } catch (error) {
      console.error('❌ Error sending message:', error);
      toast.error('Error al enviar mensaje');
      
      // Fallback AI response
      const fallbackMessage: TrainingMessage = {
        id: crypto.randomUUID(),
        role: 'ai',
        content: generateFallbackResponse(scenario.client_personality.type),
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, sessionActive, isLoading, scenario, mode, sessionSaved]);

  // Unified function to save training session - works for ALL roles
  const saveTrainingSession = useCallback(async (messagesToSave: TrainingMessage[], markCompleted: boolean = true) => {
    if (!sessionId || !startedAt || messagesToSave.length === 0) {
      console.warn('❌ Cannot save session - missing required data:', {
        hasSessionId: !!sessionId,
        hasStartedAt: !!startedAt,
        messagesCount: messagesToSave.length
      });
      return false;
    }

    try {
      console.log('💾 Saving training session to database (ALL ROLES):', {
        sessionId,
        mode,
        messagesCount: messagesToSave.length,
        markCompleted
      });

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        console.error('❌ No authenticated user found');
        return false;
      }

      // Get account ID
      let accountIdToUse: string | null = null;
      if (selectedAccountId && selectedAccountId !== 'all') {
        accountIdToUse = selectedAccountId;
      } else {
        const { data: accountData } = await supabase
          .from('user_accounts')
          .select('account_id')
          .eq('user_id', user.user.id)
          .limit(1)
          .maybeSingle();
        accountIdToUse = accountData?.account_id ?? null;
      }

      // Fallback: use scenario.account_id to satisfy RLS for elevated roles
      if (!accountIdToUse && scenario.account_id) {
        accountIdToUse = scenario.account_id;
      }

      // Get user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.user.id)
        .single();

      const userName = profileData?.full_name || user.user.email?.split('@')[0] || 'Usuario';

      // Prepare conversation data - INCLUDE audio_url for voice mode
      const conversationHistory = messagesToSave.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        audio_url: msg.audio_url || null // Preserve audio URLs for playback
      }));

      // Count messages by type
      const mensajesGenerales = messagesToSave.length;
      const mensajesIA = messagesToSave.filter(msg => msg.role === 'ai').length;
      const mensajesUsuario = messagesToSave.filter(msg => msg.role === 'user').length;

      // Validate required data
      if (!sessionId || !scenario.id || !user.user.id || !startedAt) {
        throw new Error('Missing required session data');
      }

      // Ensure conversation is valid JSON array
      if (!Array.isArray(conversationHistory)) {
        throw new Error('Conversation history must be an array');
      }

      // Compute score from conversation to avoid stale state (robust for chat/voz)
      const scoreToPersist = computeScoreFromConversation(messagesToSave, scenario);

      // Persist via secure RPC to avoid RLS edge cases (preferred)
      let savedViaEdge = false;
      let sessionData: any;
      const { data: sessionRow, error: upsertError } = await supabase.rpc('save_training_session_secure', {
        p_id: sessionId,
        p_scenario_id: scenario.id,
        p_user_id: user.user.id,
        p_user_name: userName,
        p_account_id: accountIdToUse,
        p_type: mode,
        p_status: 'completed',
        p_started_at: startedAt,
        p_completed_at: new Date().toISOString(),
        p_duration_seconds: Math.floor((new Date().getTime() - new Date(startedAt).getTime()) / 1000),
        p_conversation: conversationHistory as any,
        p_performance_score: scoreToPersist,
        p_ai_summary: 'Entrenamiento completado - Análisis disponible en historial',
        p_mensajes_generales: mensajesGenerales,
        p_mensajes_ia: mensajesIA,
        p_mensajes_usuario: mensajesUsuario,
        // Ensure we hit the extended signature (disambiguates overloads)
        p_scenario_name: scenario.name,
        p_scenario_category: scenario.category,
        p_scenario_difficulty: scenario.difficulty,
        p_scenario_description: scenario.description,
        p_client_personality: scenario.client_personality as any,
        p_objectives: scenario.objectives as any,
        p_context: scenario.context || buildScenarioContext(scenario),
      });

      if (upsertError || !sessionRow) {
        console.error('❌ Error upserting training_sessions (RPC), trying Edge Function fallback:', upsertError);
        // Fallback to Edge Function which handles RLS internally
        const payload = {
          sessionId,
          scenarioId: scenario.id,
          userId: user.user.id,
          accountId: accountIdToUse,
          type: mode,
          messages: messagesToSave.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
          finalScore: scoreToPersist,
          startedAt,
          completedAt: new Date().toISOString(),
          durationSeconds: Math.floor((new Date().getTime() - new Date(startedAt).getTime()) / 1000),
          insights: [],
          recommendations: [],
        } as const;

        const { data: efData, error: efError } = await supabase.functions.invoke('save-training-session', {
          body: payload,
        });

        if (efError || !efData?.success) {
          toast.error('No se pudo guardar la sesión (RPC y Edge).');
          throw efError || new Error('Edge function save-training-session failed');
        }

        savedViaEdge = true;
        sessionData = { id: efData.sessionId || sessionId };
      } else {
        sessionData = sessionRow as any;
      }

      console.log('✅ Session saved to training_sessions for user role:', sessionData.id);

      // Save individual messages to training_messages table
      const messagesForDb = messagesToSave.map(msg => ({
        id: msg.id,
        session_id: sessionData.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp).toISOString()
      }));

      const { error: messagesError } = await supabase
        .from('training_messages')
        .upsert(messagesForDb, { onConflict: 'id' });

      if (messagesError) {
        console.error('❌ Error upserting training_messages:', messagesError);
        throw messagesError;
      }

      console.log('✅ Messages saved to training_messages:', messagesForDb.length);

      // Mark assignment as completed if requested
      if (markCompleted) {
        const { error: assignmentError } = await supabase
          .from('scenario_assignments')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('user_id', user.user.id)
          .eq('scenario_id', scenario.id)
          .neq('status', 'completed');

        if (assignmentError) {
          console.warn('⚠️ Could not mark assignment as completed:', assignmentError);
        } else {
          console.log('✅ Assignment marked as completed');
        }
      }

      console.log('🎉 Training session fully saved:', {
        sessionId: sessionData.id,
        mode,
        messagesCount: messagesToSave.length,
        mensajesGenerales,
        mensajesIA,
        mensajesUsuario,
        score: currentScore
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to save training session:', error);
      toast.error('Error al guardar la sesión de entrenamiento');
      return false;
    }
  }, [sessionId, startedAt, currentScore, scenario.id, mode, selectedAccountId]);

  const endSession = useCallback(async () => {
    console.log('🏁 Ending training session:', { mode, sessionSaved });
    
    setSessionActive(false);
    setIsLoading(false);
    
    // For voice mode: save session when ending (if not already saved)
    if (mode === 'voice' && !sessionSaved && messages.length > 0) {
      console.log('💾 Saving voice session on end');
      await saveTrainingSession(messages, true);
      setSessionSaved(true);
    }

    toast.success('Sesión de entrenamiento finalizada');
  }, [mode, sessionSaved, messages, saveTrainingSession]);

  const resetSession = useCallback(() => {
    console.log('🔄 Resetting training session');
    setMessages([]);
    setIsLoading(false);
    setSessionActive(false);
    setCurrentScore(0);
    setSuggestions([]);
    setSessionId(null);
    setStartedAt(null);
    setSessionSaved(false);
  }, []);

  // New method for WebRTC: Add messages directly to history without AI call
  const addMessage = useCallback((role: 'user' | 'ai', content: string) => {
    const message: TrainingMessage = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date().toISOString()
    };

    console.log(`💾 Adding ${role} message to session history:`, content.substring(0, 50));
    setMessages(prev => [...prev, message]);
    
    return message;
  }, []);

  return {
    messages,
    isLoading,
    sessionActive,
    currentScore,
    suggestions,
    startSession,
    sendMessage,
    endSession,
    resetSession,
    sessionId,
    addMessage, // Export new method
  };
}

// Helper functions
function generateInitialMessage(scenario: TrainingScenario): string {
  const greetings = {
    friendly: '¡Hola! Espero que me puedas ayudar con algo.',
    neutral: 'Buenos días, necesito información sobre sus servicios.',
    suspicious: 'Hola... he tenido problemas antes, espero que esta vez sea diferente.',
    aggressive: 'Necesito que me resuelvan un problema ¡YA!',
    hurried: 'Hola, tengo muy poco tiempo, necesito ayuda rápida.',
    curious: 'Hola, he escuchado cosas interesantes sobre su empresa.',
    skeptical: 'Buenos días, aunque dudo que puedan ayudarme realmente.'
  };

  const personality = scenario.client_personality.type as keyof typeof greetings;
  return greetings[personality] || greetings.neutral;
}

function buildScenarioContext(scenario: TrainingScenario): string {
  return `
Contexto del Escenario: ${scenario.description}
Categoría: ${scenario.category}
Dificultad: ${scenario.difficulty}
Personalidad del Cliente: ${scenario.client_personality.type} - ${scenario.client_personality.description}
Características: ${scenario.client_personality.traits.join(', ')}
Objetivos de Aprendizaje: ${scenario.objectives.join(', ')}

Como cliente virtual, debes actuar de acuerdo a la personalidad ${scenario.client_personality.type} y presentar desafíos apropiados para el nivel ${scenario.difficulty}.
  `;
}

function computeScoreFromConversation(messages: TrainingMessage[], scenario: TrainingScenario): number {
  // Start at 0; only increase with quality user turns; no speech => 0
  let total = 0;
  for (const m of messages) {
    if (m.role === 'user' && typeof m.content === 'string') {
      total += evaluateResponse(m.content, scenario);
    }
  }
  return Math.max(0, Math.min(100, Math.round(total)));
}

function evaluateResponse(userMessage: string, scenario: TrainingScenario): number {
  // Strict rules:
  // - Empty/silence/very short => 0
  // - Clearly wrong/anti-service patterns => 0
  // - Otherwise small positive increments for good behaviors
  const msg = (userMessage || '').trim();
  if (msg.length < 5 || /^(mmm+|eh+|\.\.\.|silencio)$/i.test(msg)) {
    return 0;
  }

  const negativePatterns = /(no me importa|no es mi problema|no puedo ayudarte|no sé|calla|cállate|mentira|estúpido|ridículo|no me interesa)/i;
  if (negativePatterns.test(msg)) {
    return 0; // If something is wrong, score for this turn is 0
  }

  let score = 0;

  // Saludo y tono empático
  if (/\b(hola|buenos dias|buenas tardes|buenas noches)\b/i.test(msg)) score += 2;
  if (/(entiendo|comprendo|lamento|disculpa|perd[oó]n)/i.test(msg)) score += 3;

  // Indaga y propone solución
  if (/[?¿].+[\w)]/i.test(msg)) score += 2; // hace preguntas
  if (/(soluci[oó]n|ayuda|resolver|puedo|propongo|hagamos)/i.test(msg)) score += 3;

  // Claridad mínima
  if (msg.length >= 100) score += 1; // explicación estructurada

  // Clamp por turno (no más de 10 puntos por intervención)
  return Math.max(0, Math.min(10, score));
}

function generateSuggestions(userMessage: string, scenario: TrainingScenario, aiResponse: string): string[] {
  const suggestions: string[] = [];
  
  if (!/pregunta|necesita|requiere/i.test(userMessage)) {
    suggestions.push('Considera hacer preguntas para entender mejor las necesidades del cliente');
  }
  
  if (!/solucion|ayuda|resolver/i.test(userMessage)) {
    suggestions.push('Enfócate en ofrecer soluciones concretas');
  }
  
  if (scenario.client_personality.type === 'aggressive' && !/calma|tranquilo|entiendo/i.test(userMessage)) {
    suggestions.push('Mantén la calma y usa un tono empático para desescalar la situación');
  }
  
  if (scenario.client_personality.type === 'hurried' && userMessage.length > 100) {
    suggestions.push('El cliente tiene prisa, sé más conciso en tus respuestas');
  }
  
  return suggestions;
}

function generateFallbackResponse(personalityType: string): string {
  const responses = {
    friendly: 'Gracias por tu paciencia. ¿Hay algo más en lo que pueda ayudarte?',
    neutral: 'Entiendo. ¿Podrías darme más detalles?',
    suspicious: 'Hmm, necesito estar seguro de que esto va a funcionar.',
    aggressive: '¡Espero que tengas una mejor solución que el anterior agente!',
    hurried: 'Perfecto, pero necesito que sea rápido.',
    curious: 'Interesante, cuéntame más sobre eso.',
    skeptical: 'Bueno, veremos si realmente puedes resolver mi problema.'
  };
  
  return responses[personalityType as keyof typeof responses] || responses.neutral;
}