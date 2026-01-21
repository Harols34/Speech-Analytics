import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Phone,
  PhoneOff,
  Wifi,
  WifiOff,
  AlertCircle,
  Mic,
  MicOff
} from 'lucide-react';
import { TrainingScenario } from '@/lib/types/training';
import { RealtimeChat } from '@/utils/RealtimeAudioWebRTC';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTrainingSession } from '@/hooks/useTrainingSession';
import { TrainingFeedback } from './TrainingFeedback';
import { supabase } from '@/integrations/supabase/client';
import { useGlobalVoice } from '@/hooks/useGlobalVoice';
import { useConversation } from '@elevenlabs/react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

interface TrainingVoiceWebRTCDialogProps {
  scenario: TrainingScenario;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTrainingCompleted?: () => void;
}

export function TrainingVoiceWebRTCDialog({ 
  scenario, 
  open, 
  onOpenChange, 
  onTrainingCompleted 
}: TrainingVoiceWebRTCDialogProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('new');
  const [transcript, setTranscript] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [waitingForAnalysis, setWaitingForAnalysis] = useState(false);
  const chatRef = useRef<RealtimeChat | null>(null);
  const elevenSessionActiveRef = useRef(false);
  
  // Use training session hook for unified session management
  const {
    messages,
    isLoading,
    currentScore,
    sessionActive,
    startSession,
    sendMessage,
    endSession,
    resetSession,
    sessionId,
    addMessage, // New method to add messages directly
  } = useTrainingSession(scenario, 'voice');
  
  const { globalVoice } = useGlobalVoice();
  
  const isProbablyElevenLabsVoiceId = (id?: string | null) => {
    if (!id) return false;
    // ElevenLabs voice IDs are typically alphanumeric (no underscores) and reasonably long.
    // This avoids accidentally treating OpenAI voices like "alloy" as ElevenLabs IDs.
    return /^[A-Za-z0-9]{10,}$/.test(id) && !id.includes('_');
  };

  const stripAngleTags = (text: string) =>
    text
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const cleanScenarioSnippet = (text: string) => {
    const t = stripAngleTags(text)
      .replace(/^(descripci[oó]n\s+del\s+escenario\s*:\s*)/i, '')
      .replace(/^(el\s+cliente\s+virtual\s+es\s*)/i, '')
      .trim();

    return t.length > 0 ? t : scenario.name;
  };

  // Determinar voz (ElevenLabs): 1) voz del escenario (si es válida), 2) voz global (si NO es OpenAI), 3) default
  const elevenVoiceId = useMemo(() => {
    const scenarioVoice = scenario.voice_id;
    const globalVoiceId = globalVoice?.voice_id;
    const globalIsOpenAI = globalVoice?.category === 'openai';

    if (isProbablyElevenLabsVoiceId(scenarioVoice)) {
      console.log('🎙️ ElevenLabs: usando voz del escenario:', scenarioVoice, scenario.voice_name);
      return scenarioVoice!;
    }

    if (!globalIsOpenAI && isProbablyElevenLabsVoiceId(globalVoiceId)) {
      console.log('🎙️ ElevenLabs: usando voz global seleccionada:', globalVoiceId, globalVoice?.name);
      return globalVoiceId!;
    }

    console.log('🎙️ ElevenLabs: usando voz por defecto');
    return '9BWtsMINqrJLrRacOk9x';
  }, [scenario.voice_id, scenario.voice_name, globalVoice?.voice_id, globalVoice?.category, globalVoice?.name]);

  // Construir el prompt del sistema completo basado en el escenario
  const buildSystemPrompt = useMemo(() => {
    const personality = scenario.client_personality;
    const personalityType = personality?.type || 'neutral';
    const personalityTraits = personality?.traits?.join(', ') || '';

    const scenarioContext = cleanScenarioSnippet(scenario.context || scenario.description || scenario.name);

    const prompt = `Eres un CLIENTE VIRTUAL que está LLAMANDO a un agente de servicio al cliente.
TÚ ERES EL CLIENTE. La persona con quien hablas es el AGENTE de la empresa.

ESCENARIO: ${scenario.name}
TU SITUACIÓN COMO CLIENTE: ${scenarioContext}

TU PERSONALIDAD: ${personalityType}
${personalityTraits ? `TUS RASGOS: ${personalityTraits}` : ''}
${personality?.description ? `TU COMPORTAMIENTO: ${personality.description}` : ''}

${scenario.objectives?.length ? `TUS OBJETIVOS EN ESTA LLAMADA (como cliente):\n${scenario.objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}` : ''}

REGLAS ABSOLUTAS:
- NUNCA actúes como agente, vendedor o representante de servicio.
- TÚ eres quien LLAMA buscando ayuda, información o solución.
- TÚ eres quien PREGUNTA y el agente (usuario) es quien responde.
- Habla español colombiano natural.
- Responde en máximo 1-2 oraciones cortas.
- NO menciones "escenario", "descripción" ni instrucciones internas.
- NO uses etiquetas como <Valentina> o nombres de voces.
- Mantén tu personalidad ${personalityType} durante TODA la conversación.
- Si el agente te saluda, respóndele y explica tu necesidad.`;

    return prompt.trim();
  }, [scenario]);

  // Primer mensaje simple: "Hola, ¿con quién hablo?"
  const buildFirstMessage = useMemo(() => {
    return "Hola, ¿con quién hablo?";
  }, []);

  const elevenOverrides = useMemo(
    () => ({
      agent: {
        prompt: {
          prompt: buildSystemPrompt,
        },
        firstMessage: buildFirstMessage,
        language: 'es',
      },
      tts: {
        voiceId: elevenVoiceId,
      },
    }),
    [buildSystemPrompt, buildFirstMessage, elevenVoiceId]
  );
  
  // Ref to track ElevenLabs failures and allow automatic fallback to OpenAI
  const elevenLabsFailedRef = useRef(false);
  const fallbackTriggeredRef = useRef(false);
  const fallbackToOpenAIRef = useRef<(() => Promise<void>) | null>(null);
  const elevenConnectTimeoutRef = useRef<number | null>(null);

  const clearElevenConnectTimeout = () => {
    if (elevenConnectTimeoutRef.current) {
      window.clearTimeout(elevenConnectTimeoutRef.current);
      elevenConnectTimeoutRef.current = null;
    }
  };
  
  // ElevenLabs conversation hook - ESTABLE, no se recrea en cada render
  const elevenConv = useConversation({
    overrides: elevenOverrides,
    micMuted: isMicMuted,
    onConnect: async () => {
      console.log('✅ ElevenLabs connected');

      // Late connect after fallback was triggered: close immediately to avoid state corruption
      if (fallbackTriggeredRef.current) {
        try {
          await elevenConv.endSession();
        } catch {}
        return;
      }

      clearElevenConnectTimeout();
      elevenLabsFailedRef.current = false;
      elevenSessionActiveRef.current = true;
      setProviderUsed('elevenlabs');
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionState('connected');

      try {
        await startElLocalRecording();
      } catch (e) {
        console.warn('⚠️ No se pudo iniciar la grabación local (ElevenLabs):', e);
      }

      handleMessage({ type: 'session.created', provider: 'elevenlabs' });
    },
    onDisconnect: () => {
      console.log('🔌 ElevenLabs disconnected');
      clearElevenConnectTimeout();
      stopElLocalRecording();
      elevenSessionActiveRef.current = false;

      // Only update UI if we are not in the middle of a fallback
      if (!fallbackTriggeredRef.current) {
        setIsConnected(false);
      }
    },
    onMessage: (msg: any) => {
      try {
        // Skip if message is malformed (prevents SDK crashes)
        if (!msg || typeof msg !== 'object') {
          console.warn('⚠️ ElevenLabs received invalid message:', msg);
          return;
        }

        console.log('📩 ElevenLabs message:', msg);

        const normalize = (raw: any): { role: 'user' | 'ai'; content: string } | null => {
          // SDK event-style
          if (raw.type === 'user_transcript') {
            const content = stripAngleTags(String(raw.transcript ?? '')).trim();
            return content ? { role: 'user', content } : null;
          }
          if (raw.type === 'agent_response') {
            const content = stripAngleTags(String(raw.message ?? raw.transcript ?? '')).trim();
            return content ? { role: 'ai', content } : null;
          }

          // WebRTC simplified format (what we see in logs)
          if (raw.source === 'user') {
            const content = stripAngleTags(String(raw.message ?? '')).trim();
            return content ? { role: 'user', content } : null;
          }
          if (raw.source === 'ai') {
            const content = stripAngleTags(String(raw.message ?? '')).trim();
            return content ? { role: 'ai', content } : null;
          }

          // Fallback: if it only has message, assume it's AI (but avoid empty)
          if (typeof raw.message === 'string') {
            const content = stripAngleTags(raw.message).trim();
            return content ? { role: 'ai', content } : null;
          }

          return null;
        };

        const normalized = normalize(msg);
        if (!normalized) return;

        const timestamp = new Date().toISOString();
        setTranscript((prev) => [
          ...prev,
          `${normalized.role === 'user' ? 'Usuario' : 'Cliente (IA)'}: ${normalized.content}`,
        ]);

        setConversationMessages((prev) => [
          ...prev,
          {
            role: normalized.role,
            content: normalized.content,
            timestamp,
          },
        ]);

        addMessage(normalized.role, normalized.content);
      } catch (e) {
        console.error('Error handling ElevenLabs message', e);
      }
    },
    onError: async (err: any) => {
      console.error('❌ ElevenLabs error event:', err);

      const wasActive = elevenSessionActiveRef.current;
      elevenLabsFailedRef.current = true;
      elevenSessionActiveRef.current = false;
      clearElevenConnectTimeout();

      // If ElevenLabs errors AFTER it was already connected, do NOT silently switch voices/providers.
      if (wasActive) {
        console.warn('⚠️ ElevenLabs error while connected; not switching to OpenAI automatically.');
        stopElLocalRecording();
        const error = err instanceof Error ? err : new Error(String(err));
        handleError(error);
        return;
      }

      // Only fallback automatically during connection phase
      if (fallbackToOpenAIRef.current && !fallbackTriggeredRef.current) {
        console.log('🔄 ElevenLabs error (pre-connect) - triggering automatic fallback to OpenAI...');
        fallbackTriggeredRef.current = true;

        try {
          stopElLocalRecording();
          await fallbackToOpenAIRef.current();
          return;
        } catch (fallbackErr) {
          console.error('❌ Fallback to OpenAI also failed:', fallbackErr);
          const error = err instanceof Error ? err : new Error(String(err));
          handleError(error);
          return;
        }
      }

      const error = err instanceof Error ? err : new Error(String(err));
      handleError(error);
    },
  });
  
  const [providerUsed, setProviderUsed] = useState<'openai' | 'elevenlabs'>('openai');
  const elMediaRecorder = useRef<MediaRecorder | null>(null);
  const elStreamRef = useRef<MediaStream | null>(null);
  const elChunksRef = useRef<Blob[]>([]);
  const sessionUpdatedRef = useRef(false);
  
  // ElevenLabs local recording helpers
  const startElLocalRecording = async () => {
    if (elMediaRecorder.current || elStreamRef.current) {
      console.log('ℹ️ ElevenLabs local recorder already started');
      return;
    }
    elStreamRef.current = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 24000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    elMediaRecorder.current = new MediaRecorder(elStreamRef.current, { mimeType: 'audio/webm;codecs=opus' });
    elChunksRef.current = [];
    elMediaRecorder.current.ondataavailable = (e) => { if (e.data.size > 0) elChunksRef.current.push(e.data); };
    elMediaRecorder.current.start(1000);
    console.log('🎙️ Local recording started for ElevenLabs');
  };

  const stopElLocalRecording = () => {
    try {
      if (elMediaRecorder.current && elMediaRecorder.current.state !== 'inactive') {
        elMediaRecorder.current.stop();
      }
    } catch {}
    elMediaRecorder.current = null;
    if (elStreamRef.current) {
      elStreamRef.current.getTracks().forEach(t => t.stop());
      elStreamRef.current = null;
    }
  };
  
  const [conversationMessages, setConversationMessages] = useState<Array<{role: 'user' | 'ai', content: string, timestamp: string}>>([]);
  
  // Auto-scroll to latest message
  useEffect(() => {
    const chatEl = document.getElementById('chat-transcript');
    if (chatEl) {
      chatEl.scrollTop = chatEl.scrollHeight;
    }
  }, [conversationMessages]);
  
  const handleMessage = (event: any) => {
    console.log('📩 Event received:', event.type);
    
    switch (event.type) {
      case 'response.audio_transcript.delta':
        // AI is speaking (partial transcript)
        setIsSpeaking(true);
        break;
        
      case 'response.audio_transcript.done':
        // AI finished speaking - SAVE TO UNIFIED HISTORY
        setIsSpeaking(false);
        if (event.transcript) {
          const aiContent = event.transcript.trim();
          const aiTimestamp = new Date().toISOString();
          
          console.log('🤖 [CLIENTE IA HABLÓ]:', aiContent);
          console.log('   Timestamp:', aiTimestamp);
          
          setTranscript(prev => [...prev, `Cliente (IA): ${aiContent}`]);
          
          // Add to local state for display
          const aiMsg = {
            role: 'ai' as const,
            content: aiContent,
            timestamp: aiTimestamp
          };
          setConversationMessages(prev => [...prev, aiMsg]);
          
          // CRITICAL: Save AI message to unified session history
          addMessage('ai', aiContent);
          console.log('💾 AI message saved to unified session');
        }
        break;
        
      case 'conversation.item.input_audio_transcription.completed':
        // User speech transcribed - SAVE TO UNIFIED HISTORY
        if (event.transcript) {
          const userContent = event.transcript.trim();
          if (userContent.length > 0) {
            const userTimestamp = new Date().toISOString();
            
            console.log('👤 [USUARIO HABLÓ]:', userContent);
            console.log('   Timestamp:', userTimestamp);
            
            // Verificar si es ruido/audio de la IA filtrado
            const suspiciousPatterns = /thank you|ご視聴|czy ktoś|merci|grazie|danke/i;
            if (suspiciousPatterns.test(userContent)) {
              console.warn('⚠️ POSIBLE LOOP DE AUDIO DETECTADO - Transcripción sospechosa:', userContent);
              console.warn('⚠️ SOLUCIÓN: Usar AUDÍFONOS o verificar que micrófono esté muteado cuando IA habla');
              // Aún así guardamos el mensaje por si es real
            }
            
            setTranscript(prev => [...prev, `Usuario: ${userContent}`]);
            
            // Add to local state for display
            const userMsg = {
              role: 'user' as const,
              content: userContent,
              timestamp: userTimestamp
            };
            setConversationMessages(prev => [...prev, userMsg]);
            
            // CRITICAL: Save user message to unified session history
            addMessage('user', userContent);
            console.log('💾 User message saved to unified session');
          }
        }
        break;
      
      case 'session.created':
        // Session established - waiting for session.update to complete before requesting AI response
        console.log('🎉 WebRTC session created - waiting for session update...');
        sessionUpdatedRef.current = false;
        break;
      
      case 'session.updated':
        // Session updated with correct instructions - NOW request AI first message
        console.log('✅ Session updated with instructions - AI can now speak correctly');
        sessionUpdatedRef.current = true;
        
        // Request AI first message after a short delay
        if (providerUsed === 'openai' && chatRef.current?.isReady()) {
          setTimeout(() => {
            if (chatRef.current?.isReady()) {
              chatRef.current.requestAIFirstMessage();
              console.log('🎤 AI first message requested after session update');
            }
          }, 500);
        }
        break;
      
      case 'input_audio_buffer.speech_started':
        // User started speaking
        console.log('🎤 Usuario comenzó a hablar (detectado por VAD)');
        break;
      
      case 'input_audio_buffer.speech_stopped':
        // User stopped speaking - transcription will follow
        console.log('🎤 Usuario dejó de hablar, esperando transcripción...');
        break;
      
      case 'input_audio_buffer.committed':
        // Audio buffer committed for processing
        console.log('📝 Buffer de audio del usuario enviado para transcripción');
        break;
        
      case 'response.done':
        // Response completed
        setIsSpeaking(false);
        console.log('✅ AI response completed');
        break;
        
      case 'error':
        console.error('❌ WebRTC error:', event.error);
        toast.error(`Error: ${event.error?.message || 'Unknown error'}`);
        break;
    }
  };

  const handleError = (error: Error) => {
    console.error('❌ Connection error:', error);
    toast.error(`Error de conexión: ${error.message}`);
    setIsConnected(false);
    setIsConnecting(false);
  };

  useEffect(() => {
    if (!open) return;

    const matchesElevenLabsCrash = (err: any) => {
      const msg = String(err?.message || err || '');
      const stack = String(err?.stack || '');
      return msg.includes('error_type') || stack.includes('@11labs_react') || stack.includes('@elevenlabs_react');
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Only handle when an ElevenLabs voice is selected; avoid swallowing unrelated errors
      if (globalVoice?.category !== 'elevenlabs') return;
      if (!matchesElevenLabsCrash(event.reason)) return;
      if (!fallbackToOpenAIRef.current || fallbackTriggeredRef.current) return;

      console.warn('⚠️ Capturado unhandledrejection de ElevenLabs WebRTC; haciendo fallback a OpenAI', event.reason);
      fallbackTriggeredRef.current = true;
      clearElevenConnectTimeout();

      void (async () => {
        try {
          try {
            await elevenConv.endSession();
          } catch {}
          stopElLocalRecording();
          toast.info('Error interno de ElevenLabs, usando OpenAI...', { duration: 2500 });
          await fallbackToOpenAIRef.current?.();
        } catch (e) {
          console.error('❌ Fallback (unhandledrejection) falló:', e);
        }
      })();

      event.preventDefault?.();
    };

    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', onUnhandledRejection);
  }, [open, globalVoice]);

  const startConversation = async () => {
    if (isConnecting || isConnected) {
      console.log('⏳ Start ignored: already connecting/connected');
      return;
    }
    setIsConnecting(true);
    
    // Reset ElevenLabs failure flags for fresh attempt
    elevenLabsFailedRef.current = false;
    fallbackTriggeredRef.current = false;
    clearElevenConnectTimeout();
    
    try {
      // Start unified training session
      await startSession();
      
      // Prepare OpenAI voice configuration
      const openAiRealtime = new Set(['alloy','ash','ballad','coral','echo','sage','shimmer','verse']);
      let voiceIdOpenAI = 'alloy';
      if (globalVoice?.category === 'openai' && globalVoice.voice_id && openAiRealtime.has(globalVoice.voice_id)) {
        voiceIdOpenAI = globalVoice.voice_id;
      }

      // Helper to start OpenAI Realtime as fallback
      const startOpenAI = async () => {
        console.log('🎯 Usando OpenAI Realtime WebRTC con voz:', voiceIdOpenAI);
        setProviderUsed('openai');
        elevenSessionActiveRef.current = false;

        chatRef.current = new RealtimeChat(
          handleMessage,
          handleError,
          (speaking) => {
            setIsSpeaking(speaking);
            setIsMicMuted(speaking);
            console.log('🎤 AI speaking state changed:', speaking);
          }
        );

        await chatRef.current.init(scenario, voiceIdOpenAI);

        setIsConnected(true);
        setConnectionState('connected');
        setIsConnecting(false);
        console.log('✅ OpenAI WebRTC connection established');
        console.log('⏳ Waiting for session.updated event before requesting AI first message...');
      };

      // Register fallback function for async error handler
      fallbackToOpenAIRef.current = startOpenAI;

      // Check if user explicitly selected OpenAI voice - skip ElevenLabs in that case
      const shouldUseOpenAI = globalVoice?.category === 'openai';
      
      if (shouldUseOpenAI) {
        console.log('🎯 User selected OpenAI voice, using OpenAI directly');
        await startOpenAI();
        toast.success('✅ Conectado con OpenAI Realtime', { duration: 2000 });
        return;
      }

      // STRATEGY: Try ElevenLabs first, fallback to OpenAI if it fails
      console.log('🔍 Intentando conexión con ElevenLabs WebRTC...');
      
      let elevenLabsFailed = false;
      let elevenLabsErrorMsg = '';
      
      try {
        // CRITICAL: Request microphone permission BEFORE starting ElevenLabs session
        // The ElevenLabs SDK requires this to properly set up WebRTC audio tracks
        console.log('🎤 Requesting microphone permission for ElevenLabs...');
        try {
          const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          permissionStream.getTracks().forEach((t) => t.stop());
          console.log('✅ Microphone permission granted');
          setIsMicMuted(false);
        } catch (micError) {
          console.error('❌ Microphone permission denied:', micError);
          toast.error('Se requiere acceso al micrófono para el entrenamiento de voz');
          throw new Error('Microphone permission denied');
        }
        
        const agentId = localStorage.getItem('elevenlabs_agent_id');
        if (!agentId) {
          console.warn('⚠️ No Agent ID in localStorage - will use server-configured ELEVENLABS_AGENT_ID');
        } else {
          console.log('📋 Using ElevenLabs Agent ID from localStorage:', agentId);
        }
        
        // Invoke edge function to get WebRTC conversation token
        const { data, error } = await supabase.functions.invoke('elevenlabs-get-signed-url', {
          body: { 
            agentId,
            voiceId: elevenVoiceId,
            connectionType: 'webrtc', // Request WebRTC token
            scenario: {
              name: scenario.name,
              description: scenario.description,
              client_personality: scenario.client_personality,
              category: scenario.category,
              context: scenario.context
            }
          }
        });

        console.log('📡 ElevenLabs edge function response:', { 
          hasData: !!data, 
          hasToken: !!(data?.conversationToken || data?.token),
          hasUrl: !!(data?.url || data?.signedUrl),
          agentUsed: (data as any)?.agentId || 'unknown',
          connectionType: data?.connectionType,
          error: error?.message 
        });

        // Check if we got a valid token (for WebRTC) or URL (for WebSocket)
        const conversationToken = data?.conversationToken || data?.token;
        const signedUrl = data?.url || data?.signedUrl;
        
        if (error || (!conversationToken && !signedUrl)) {
          elevenLabsErrorMsg = error?.message || data?.error || 'No credentials received';
          console.warn('⚠️ ElevenLabs no disponible:', elevenLabsErrorMsg);
          throw new Error(elevenLabsErrorMsg);
        }
        
        // SUCCESS: We have valid ElevenLabs credentials
        console.log('✅ Got ElevenLabs credentials, proceeding with ElevenLabs...');
        console.log('📋 Connection type:', conversationToken ? 'WebRTC (token)' : 'WebSocket (signedUrl)');
        
        // Local recording for ElevenLabs will start on connect (see onConnect)

        // Start ElevenLabs conversation session with correct parameters
        console.log('🚀 Starting ElevenLabs session...');
        
        // Connection timeout: if onConnect doesn't happen in 8 seconds, fallback to OpenAI
        clearElevenConnectTimeout();
        elevenConnectTimeoutRef.current = window.setTimeout(() => {
          if (fallbackTriggeredRef.current || elevenSessionActiveRef.current) return;
          if (!fallbackToOpenAIRef.current) return;

          console.warn('⏰ ElevenLabs connection timeout - falling back to OpenAI');
          elevenLabsFailedRef.current = true;
          elevenSessionActiveRef.current = false;
          fallbackTriggeredRef.current = true;

          void (async () => {
            try {
              try {
                await elevenConv.endSession();
              } catch {}
              stopElLocalRecording();
              toast.info('Tiempo de espera agotado, usando OpenAI...', { duration: 2500 });
              await fallbackToOpenAIRef.current?.();
            } catch (e) {
              console.error('❌ Timeout fallback falló:', e);
            }
          })();
        }, 8000);

        try {
          if (conversationToken) {
            // WebRTC connection using conversation token
            console.log('🔌 Starting WebRTC session with conversationToken...');
            await elevenConv.startSession({
              conversationToken,
              connectionType: 'webrtc'
            });
          } else if (signedUrl) {
            // WebSocket connection using signed URL
            console.log('🔌 Starting WebSocket session with signedUrl...');
            await elevenConv.startSession({
              signedUrl,
              connectionType: 'websocket'
            });
          }
        } catch (startErr: any) {
          console.warn('❗ startSession with credentials failed, trying fallback with agentId...', startErr);
          const reason = String(startErr?.reason || startErr?.message || '');
          // If the agent does not exist, do not retry with agentId
          if (/does not exist/i.test(reason)) {
            throw new Error(reason || 'ElevenLabs agent no existe');
          }
          // Fallback: try with agentId directly (for public agents)
          const finalAgentId = agentId || data?.agentId;
          if (finalAgentId) {
            console.log('🔄 Trying direct agentId connection:', finalAgentId);
            await elevenConv.startSession({ 
              agentId: finalAgentId,
              connectionType: 'webrtc'
            });
          } else {
            throw startErr;
          }
        }
        
        // Do NOT mark as connected yet: ElevenLabs is only connected when onConnect fires.
        console.log('⏳ ElevenLabs startSession iniciado; esperando onConnect...');
        
      } catch (elevenError) {
        elevenLabsFailed = true;
        elevenLabsFailedRef.current = true;
        fallbackTriggeredRef.current = true;
        clearElevenConnectTimeout();
        elevenLabsErrorMsg = elevenError instanceof Error ? elevenError.message : 'Unknown error';

        // ElevenLabs failed - AUTOMATIC FALLBACK to OpenAI
        console.warn('⚠️ ElevenLabs WebRTC failed, falling back to OpenAI:', elevenError);
        console.warn('⚠️ Razón del fallo:', elevenLabsErrorMsg);

        // Clean up any ElevenLabs resources if started
        try {
          if (elevenConv.status === 'connected') {
            await elevenConv.endSession();
          }
        } catch (cleanupErr) {
          console.warn('⚠️ Error al limpiar ElevenLabs:', cleanupErr);
        }
        stopElLocalRecording();
        setIsSpeaking(false);
        elevenSessionActiveRef.current = false;

        // Start OpenAI as fallback
        console.log('🔄 Iniciando fallback a OpenAI Realtime...');
        toast.info('ElevenLabs no disponible, usando OpenAI...', { duration: 2500 });
        try {
          await startOpenAI();
          toast.success('✅ Conectado con OpenAI Realtime', { duration: 2000 });
        } catch (openAiError) {
          console.error('❌ OpenAI también falló:', openAiError);
          throw openAiError; // Re-throw para que sea capturado por el catch externo
        }
      }
      
    } catch (error) {
      console.error('❌ Error starting conversation:', error);
      toast.error(error instanceof Error ? error.message : 'Error al iniciar conversación');
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const saveRecording = async (audioBlob: Blob, sessionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ No user authenticated');
        return;
      }

      const fileName = `${user.id}/${sessionId}.webm`;
      
      console.log('📤 WebRTC: Uploading recording:', { fileName, size: audioBlob.size });
      
      const { error: uploadError } = await supabase.storage
        .from('training-recordings')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          upsert: true
        });

      if (uploadError) {
        console.error('❌ WebRTC: Upload error:', uploadError);
        throw uploadError;
      }

      const recordingPath = fileName; // Guardamos la ruta del objeto en Storage
      
      // Actualizar sesión con la ruta del archivo (no URL firmada)
      const { error: recErr } = await supabase.rpc('update_training_session_recording', {
        p_session_id: sessionId,
        p_recording_url: recordingPath
      });

      if (recErr) {
        console.error('❌ WebRTC: RPC error:', recErr);
        throw recErr;
      }
      
      console.log('✅ WebRTC: Grabación guardada exitosamente');
      toast.success('Grabación WebRTC guardada');
    } catch (error) {
      console.error('❌ WebRTC: Error guardando grabación:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`Error al guardar la grabación: ${errorMessage}`);
    }
  };

  const endConversation = async () => {
    console.log('🛑 Ending WebRTC training session - blocking UI for analysis');
    
    // Block UI immediately
    setWaitingForAnalysis(true);
    
    try {
      // Handle recording based on provider
      if (providerUsed === 'elevenlabs' && sessionId) {
        // Stop ElevenLabs session
        if (elevenConv.status === 'connected') {
          await elevenConv.endSession();
          elevenSessionActiveRef.current = false;
          console.log('✅ ElevenLabs session ended');
        }
        
        // Stop and save local recording
        if (elMediaRecorder.current && elMediaRecorder.current.state !== 'inactive') {
          elMediaRecorder.current.stop();
          
          await new Promise<void>((resolve) => {
            elMediaRecorder.current!.onstop = async () => {
              const audioBlob = new Blob(elChunksRef.current, { type: 'audio/webm' });
              console.log('🎙️ ElevenLabs recording stopped, size:', audioBlob.size);
              if (audioBlob.size > 0) {
                await saveRecording(audioBlob, sessionId);
              }
              resolve();
            };
          });
        }
        
        // Clean up stream
        if (elStreamRef.current) {
          elStreamRef.current.getTracks().forEach(track => track.stop());
          elStreamRef.current = null;
        }
      } else if (providerUsed === 'openai' && chatRef.current && sessionId) {
        // Get OpenAI recording
        const recording = await chatRef.current.getRecording();
        if (recording) {
          await saveRecording(recording, sessionId);
        }
        
        // Disconnect OpenAI WebRTC
        chatRef.current.disconnect();
        chatRef.current = null;
      }
      
      setIsConnected(false);
      setIsSpeaking(false);
      setConnectionState('closed');
      
      // End unified training session (triggers save and analysis)
      await endSession();
      onTrainingCompleted?.();
      
      // Show feedback dialog
      setShowFeedback(true);
      console.log('✅ WebRTC session ended, showing feedback');
    } catch (error) {
      console.error('❌ Error ending conversation:', error);
      toast.error('Error al finalizar la sesión');
      setWaitingForAnalysis(false);
    }
  };

  const handleClose = async () => {
    // If session is active, end it first
    if (isConnected) {
      await endConversation();
      return; // Don't close yet, wait for analysis
    }
    
    // Only allow closing if not waiting for analysis
    if (!waitingForAnalysis) {
      setTranscript([]);
      setConversationMessages([]);
      setShowFeedback(false);
      resetSession();
      onOpenChange(false);
    }
  };

  useEffect(() => {
    if (!open) {
      // Clean up OpenAI connection
      if (chatRef.current) {
        chatRef.current.disconnect();
        chatRef.current = null;
      }
      
      // Clean up ElevenLabs connection ONLY if active
      if (elevenSessionActiveRef.current && elevenConv.status === 'connected') {
        elevenConv.endSession().catch(console.error);
        elevenSessionActiveRef.current = false;
      }
      if (elMediaRecorder.current && elMediaRecorder.current.state !== 'inactive') {
        elMediaRecorder.current.stop();
      }
      if (elStreamRef.current) {
        elStreamRef.current.getTracks().forEach(track => track.stop());
        elStreamRef.current = null;
      }
      
      setIsConnected(false);
      setConversationMessages([]);
      setTranscript([]);
    }
  }, [open]);

  const toggleMicMute = () => {
    if (!isConnected) return;

    const newMutedState = !isMicMuted;
    setIsMicMuted(newMutedState);

    if (providerUsed === 'openai') {
      chatRef.current?.setMicMuted(newMutedState);
    }

    toast.info(newMutedState ? 'Micrófono silenciado' : 'Micrófono activado');
  };
 
   return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg flex items-center gap-2">
                Entrenamiento WebRTC: {scenario.name}
                {isConnected && (
                  <>
                    <Badge variant="outline" className="ml-2 text-green-600 border-green-600">
                      <Wifi className="h-3 w-3 mr-1" />
                      Conectado
                    </Badge>
                    <Badge variant="secondary" className="ml-1">
                      {providerUsed === 'elevenlabs' ? '🎙️ ElevenLabs' : '🤖 OpenAI'}
                    </Badge>
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Modo Voz WebRTC • Conversación en tiempo real con latencia ultra-baja
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col gap-4">
          {/* Resizable layout: Call interface (top) + Transcript (bottom) */}
          <ResizablePanelGroup direction="vertical" className="flex-1 min-h-0 gap-4">
            <ResizablePanel defaultSize={40} minSize={20}>
              {/* Call Interface */}
              <Card className="flex-1 min-h-0">
                <CardContent className="flex flex-col items-center justify-center h-full space-y-6 p-8">
                  {/* Status Icon */}
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center ${
                    isConnected ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <Phone className="h-12 w-12" />
                  </div>

                  {/* Status Text */}
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-medium">
                      {isConnecting ? 'Conectando...' : isConnected ? 'Llamada en curso' : 'Listo para iniciar'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {isConnecting 
                        ? 'Estableciendo conexión WebRTC...'
                        : isConnected 
                          ? isSpeaking ? 'El cliente está hablando...' : 'Puedes hablar ahora'
                          : 'Presiona el botón para iniciar la conversación'
                      }
                    </p>
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                      <span>Estado: {connectionState}</span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex gap-4">
                    {!isConnected ? (
                      <Button
                        size="lg"
                        onClick={startConversation}
                        disabled={isConnecting}
                        className="rounded-full w-16 h-16"
                      >
                        <Phone className="h-6 w-6" />
                      </Button>
                    ) : (
                      <>
                        {/* Botón de silenciar micrófono */}
                        <Button
                          variant={isMicMuted ? "secondary" : "outline"}
                          size="lg"
                          onClick={toggleMicMute}
                          className="rounded-full w-16 h-16"
                          title={isMicMuted ? "Activar micrófono" : "Silenciar micrófono"}
                        >
                          {isMicMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                        </Button>
                        {/* Botón de colgar */}
                        <Button
                          variant="destructive"
                          size="lg"
                          onClick={endConversation}
                          className="rounded-full w-16 h-16"
                        >
                          <PhoneOff className="h-6 w-6" />
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Speaking/Mic Indicators */}
                  {isConnected && (
                    <div className="flex flex-col items-center gap-2">
                      {isSpeaking && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          Cliente hablando...
                        </div>
                      )}
                      {isMicMuted && (
                        <div className="flex items-center gap-2 text-sm text-orange-600">
                          <MicOff className="h-3 w-3" />
                          Micrófono silenciado
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={60} minSize={20}>
              {/* Transcript - Chat Bubbles Style */}
              <Card className="h-full flex flex-col">
                <CardContent className="p-4 flex-1 flex flex-col min-h-0">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <span>💬</span>
                    <span>Conversación en Vivo</span>
                  </h4>
                  <div className="flex-1 overflow-y-auto space-y-3 scroll-smooth" id="chat-transcript">
                    {([...conversationMessages]
                      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                    ).map((m, i) => {
                      const isAI = m.role === 'ai';
                      const displayTime = new Date(m.timestamp).toLocaleTimeString('es-CO', {
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                      return (
                        <div
                          key={`${m.timestamp}-${i}`}
                          className={`flex ${isAI ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-2`}
                        >
                          <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                            isAI 
                              ? 'bg-secondary text-secondary-foreground' 
                              : 'bg-primary text-primary-foreground'
                          }`}>
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className="text-xs font-semibold">
                                {isAI ? '🤖 Cliente (IA)' : '👤 Usuario (Tú)'}
                              </span>
                              <span className="text-xs opacity-70">{displayTime}</span>
                            </div>
                            <p className="text-sm leading-relaxed">{m.content}</p>
                          </div>
                        </div>
                      );
                    })}
                    {conversationMessages.length === 0 && (
                      <div className="text-sm text-muted-foreground">Sin mensajes aún</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Feedback Dialog - UNIFIED WITH OTHER MODES */}
        <TrainingFeedback
          open={showFeedback}
          onOpenChange={(open) => {
            setShowFeedback(open);
            if (!open) {
              setWaitingForAnalysis(false);
              onOpenChange(false);
            }
          }}
          scenario={scenario}
          messages={messages}
          finalScore={currentScore}
          sessionId={sessionId || undefined}
          onAnalysisComplete={() => setWaitingForAnalysis(false)}
        />

        {/* Blocking overlay while waiting for analysis */}
        {waitingForAnalysis && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-card p-8 rounded-lg shadow-lg text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <h3 className="text-lg font-medium">Finalizando sesión WebRTC...</h3>
              <p className="text-sm text-muted-foreground">Guardando conversación y generando análisis</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}