
import { useState, useEffect, useRef } from "react";
import { Call, Feedback, BehaviorAnalysis } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateCallStatus } from "@/components/calls/detail/CallUtils";

// Enhanced cache with better TTL management
const callCache = new Map<string, {
  data: Call,
  timestamp: number,
  transcriptSegments: any[]
}>();

// TTL in milliseconds (15 minutes for better performance)
const CACHE_TTL = 15 * 60 * 1000;

// Cleanup old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of callCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      callCache.delete(key);
    }
  }
}, 5 * 60 * 1000); // Cleanup every 5 minutes

export function useCallData(id: string | undefined) {
  const [call, setCall] = useState<Call | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [transcriptSegments, setTranscriptSegments] = useState<any[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const isMounted = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isMounted.current = true;
    
    if (!id || id === '*' || id === 'undefined' || id === 'null') {
      setIsLoading(false);
      setLoadError("ID de llamada inválido");
      return;
    }
    
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const now = Date.now();
    const cachedData = callCache.get(id);
    
    // Use cache if available and not expired
    if (cachedData && now - cachedData.timestamp < CACHE_TTL) {
      console.log("Using cached call data for ID:", id);
      if (isMounted.current) {
        setCall(cachedData.data);
        setTranscriptSegments(cachedData.transcriptSegments);
        setIsLoading(false);
        setLoadError(null);
      }
      return;
    }
    
    const loadCallData = async () => {
      if (!isMounted.current) return;
      
      // Create new abort controller
      abortControllerRef.current = new AbortController();
      
      setIsLoading(true);
      setLoadError(null);
      
      try {
        console.log("Loading call data for ID:", id);
        
        // Optimized query with better timeout handling
        const { data: callData, error: callError } = await supabase
          .from('calls')
          .select('*')
          .eq('id', id)
          .abortSignal(abortControllerRef.current.signal)
          .single();
          
        if (callError) {
          if (callError.name === 'AbortError') {
            return;
          }
          console.error("Error loading call:", callError);
          if (isMounted.current) {
            setLoadError(`Error loading call: ${callError.message}`);
          }
          return;
        }
        
        if (!callData) {
          console.error("No call found with ID:", id);
          if (isMounted.current) {
            setLoadError("Call not found");
          }
          return;
        }
        
        console.log("Call data loaded:", callData);
        
        const callObject: Call = {
          id: callData.id,
          title: callData.title,
          filename: callData.filename,
          agentName: callData.agent_name || "Sin asignar",
          agentId: callData.agent_id,
          duration: callData.duration || 0,
          date: callData.date,
          status: validateCallStatus(callData.status),
          progress: callData.progress,
          audio_url: callData.audio_url,
          audioUrl: callData.audio_url,
          transcription: callData.transcription,
          summary: callData.summary,
          result: (callData.result as "venta" | "no venta" | "") || "",
          product: (callData.product as "fijo" | "móvil" | "") || "",
          reason: callData.reason || "",
          tipificacionId: callData.tipificacion_id,
          speaker_analysis: callData.speaker_analysis || null,
          statusSummary: callData.status_summary || "",
          account_id: callData.account_id
        };
        
        let segments: any[] = [];

        // Optimized transcription parsing
        if (callData.transcription && typeof callData.transcription === "string") {
          const transcriptionText = callData.transcription.trim();
          
          if (transcriptionText.includes('[') && transcriptionText.includes(']:')) {
            console.log("Parsing timestamped transcription format");
            segments = parseTimestampedTranscription(transcriptionText);
          } else {
            console.log("Transcription does not appear to be in timestamped format");
            const lines = transcriptionText.split('\n').filter(line => line.trim());
            segments = lines.map((line, index) => {
              const raw = line.trim();
              console.log(`🔍 Parsing line ${index}: "${raw.substring(0, 80)}..."`);
              
              // Detectar prefijos explícitos de manera más amplia
              const prefMatch = raw.match(/^(?:\[[\d:]+\]\s*)?(Asesor|Cliente|Silencio)\s*:\s*(.+)$/i);
              if (prefMatch) {
                const role = prefMatch[1].toLowerCase();
                const text = prefMatch[2].trim();
                const speaker: 'agent' | 'client' | 'silence' = role === 'cliente' ? 'client' : role === 'asesor' ? 'agent' : 'silence';
                console.log(`✅ Explicit role detected: ${role} -> ${speaker}`);
                return { text, speaker, start: index * 5, end: (index + 1) * 5, explicit: true };
              }
              
              // Si contiene ":" pero no es un prefijo conocido, revisar contenido
              if (raw.includes(':')) {
                const colonIndex = raw.indexOf(':');
                const beforeColon = raw.substring(0, colonIndex).toLowerCase().trim();
                const afterColon = raw.substring(colonIndex + 1).trim();
                
                // Verificar si antes del ":" hay algo que indique el hablante
                if (beforeColon.includes('cliente') || beforeColon.includes('client')) {
                  console.log(`✅ Cliente detected from colon pattern: "${beforeColon}"`);
                  return { text: afterColon, speaker: 'client', start: index * 5, end: (index + 1) * 5, explicit: true };
                } else if (beforeColon.includes('asesor') || beforeColon.includes('agente') || beforeColon.includes('agent')) {
                  console.log(`✅ Asesor detected from colon pattern: "${beforeColon}"`);
                  return { text: afterColon, speaker: 'agent', start: index * 5, end: (index + 1) * 5, explicit: true };
                } else if (beforeColon.includes('silencio') || beforeColon.includes('silence')) {
                  console.log(`✅ Silencio detected from colon pattern: "${beforeColon}"`);
                  return { text: afterColon, speaker: 'silence', start: index * 5, end: (index + 1) * 5, explicit: true };
                }
              }
              
              // Fallback: alternancia simple Cliente-Asesor en lugar de defaultear a asesor
              const text = stripSpeakerAndTimestamp(raw);
              const speaker: 'agent' | 'client' | 'silence' = index % 2 === 0 ? 'client' : 'agent'; // Empezar con cliente
              console.log(`⚠️ Fallback alternation for line ${index}: ${speaker}`);
              return { text, speaker, start: index * 5, end: (index + 1) * 5, explicit: false };
            });
          }
        } else if (Array.isArray(callData.transcription)) {
          segments = callData.transcription.filter(item => item && typeof item === 'object' && item.text);
        }

        // Verificar si ya hay roles explícitos bien distribuidos antes de normalizar
        const hasExplicitRoles = segments.some((s: any) => s.explicit);
        const clientSegments = segments.filter((s: any) => s.speaker === 'client').length;
        const agentSegments = segments.filter((s: any) => s.speaker === 'agent').length;
        
        console.log(`📊 Role distribution: ${clientSegments} client, ${agentSegments} agent, hasExplicit: ${hasExplicitRoles}`);
        
        // Solo normalizar si no hay roles explícitos y hay desbalance extremo
        if (!hasExplicitRoles && (clientSegments === 0 || agentSegments === 0) && segments.length > 2) {
          console.log('🔄 Applying normalization due to missing roles...');
          segments = normalizeDiarization(segments);
        } else {
          console.log('✅ Keeping explicit roles as-is');
        }
        
        // Load feedback data with better error handling
        if (callData.id && isMounted.current) {
          try {
            const { data: feedbackData, error: feedbackError } = await supabase
              .from('feedback')
              .select('*')
              .eq('call_id', callData.id)
              .abortSignal(abortControllerRef.current.signal)
              .maybeSingle();
            
            if (feedbackError && feedbackError.name !== 'AbortError') {
              console.error("Error loading feedback:", feedbackError);
            }
            
            if (feedbackData && isMounted.current) {
              console.log("Feedback loaded:", feedbackData);
              
              let behaviorsAnalysis: BehaviorAnalysis[] = [];
              
              if (feedbackData.behaviors_analysis) {
                try {
                  if (typeof feedbackData.behaviors_analysis === 'string') {
                    const parsed = JSON.parse(feedbackData.behaviors_analysis);
                    behaviorsAnalysis = validateBehaviorsAnalysis(parsed);
                  } else if (Array.isArray(feedbackData.behaviors_analysis)) {
                    behaviorsAnalysis = validateBehaviorsAnalysis(feedbackData.behaviors_analysis);
                  }
                } catch (e) {
                  console.error("Error parsing behaviors_analysis:", e);
                  behaviorsAnalysis = [];
                }
              }
              
              const typedFeedback: Feedback = {
                positive: feedbackData.positive || [],
                negative: feedbackData.negative || [],
                opportunities: feedbackData.opportunities || [],
                score: feedbackData.score || 0,
                behaviors_analysis: behaviorsAnalysis,
                call_id: feedbackData.call_id,
                id: feedbackData.id,
                created_at: feedbackData.created_at,
                updated_at: feedbackData.updated_at,
                sentiment: feedbackData.sentiment,
                topics: feedbackData.topics,
                entities: feedbackData.entities
              };
              
              callObject.feedback = typedFeedback;
            }
          } catch (error) {
            if (error.name !== 'AbortError') {
              console.error("Error loading feedback:", error);
            }
          }
        }
        
        // Cache data only if mount is still active
        if (isMounted.current) {
          callCache.set(id, {
            data: callObject,
            timestamp: Date.now(),
            transcriptSegments: segments
          });
          
          setCall(callObject);
          setTranscriptSegments(segments);
          setIsLoading(false);
          setLoadError(null);
        }
        
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }
        console.error("Error loading data:", error);
        if (isMounted.current) {
          setLoadError(error instanceof Error ? error.message : "Unknown error");
          setIsLoading(false);
        }
      }
    };

    loadCallData();
    
    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [id]);

  // Optimized helper function to parse timestamped text format
  function parseTimestampedTranscription(text: string): any[] {
    const lines = text.split('\n').filter(line => line.trim());
    const segments: any[] = [];
    
    console.log(`Parsing ${lines.length} lines from transcription`);
    
    lines.forEach((line, index) => {
      // Primero, si la parte después del timestamp indica Silencio
      const silenceFirst = line.match(/^\[(\d+):(\d+)\]\s*Silencio:\s*(\d+)/i);
      if (silenceFirst) {
        const [, minutes, seconds, duration] = silenceFirst;
        const startTime = parseInt(minutes) * 60 + parseInt(seconds);
        segments.push({
          text: `Silencio: ${duration} segundos`,
          speaker: 'silence',
          start: startTime,
          end: startTime + parseInt(duration),
          explicit: true
        });
        return;
      }
      const timestampMatch = line.match(/^\[(\d+):(\d+)\]\s*(.+?):\s*(.+)$/);
      if (timestampMatch) {
        const [, minutes, seconds, speaker, text] = timestampMatch;
        
        let speakerType = 'agent';
        const speakerLower = speaker.toLowerCase();
        
        if (speakerLower.includes('cliente') || speakerLower.includes('client')) {
          speakerType = 'client';
        } else if (speakerLower.includes('asesor') || speakerLower.includes('agente') || speakerLower.includes('agent')) {
          speakerType = 'agent';
        }
        
        const startTime = parseInt(minutes) * 60 + parseInt(seconds);
        
        segments.push({
          text: stripSpeakerAndTimestamp(text.trim()),
          speaker: speakerType,
          start: startTime,
          end: startTime + 5,
          explicit: true
        });
      } else if (line.includes('Silencio:')) {
        const silenceMatch = line.match(/^\[(\d+):(\d+)\]\s*Silencio:\s*(\d+)/);
        if (silenceMatch) {
          const [, minutes, seconds, duration] = silenceMatch;
          const startTime = parseInt(minutes) * 60 + parseInt(seconds);
          
          segments.push({
            text: `Silencio: ${duration} segundos`,
            speaker: 'silence',
            start: startTime,
            end: startTime + parseInt(duration),
            explicit: true
          });
        }
      } else if (line.trim() && !line.includes('No hay transcripción disponible')) {
        let speakerType = 'agent';
        const lower = line.toLowerCase();
        if (lower.includes('cliente:')) {
          speakerType = 'client';
        } else if (lower.includes('silencio:')) {
          speakerType = 'silence';
        }
        
        segments.push({
          text: stripSpeakerAndTimestamp(line.trim()),
          speaker: speakerType,
          start: index * 5,
          end: (index + 1) * 5,
          explicit: /^(asesor|agente|cliente|silencio)\s*:/i.test(line.trim())
        });
      }
    });
    
    console.log("Parsed", segments.length, "segments from timestamped transcription");
    return segments;
  }

  // Limpia prefijos redundantes en texto como "Asesor:"/"Cliente:" y timestamps "[mm:ss]"
  function stripSpeakerAndTimestamp(input: string): string {
    if (!input) return input;
    let out = input.replace(/^\s*\[(\d+):(\d+)\]\s*/i, '');
    out = out.replace(/^\s*(asesor|agente|cliente)\s*:\s*/i, '');
    return out.trim();
  }

  // Normaliza la diarización: si sólo hay un hablante detectado, intenta separar
  // basándose en señales fuertes (pregunta → respuesta corta) y ack-words.
  function normalizeDiarization(rawSegments: any[]): any[] {
    if (!Array.isArray(rawSegments) || rawSegments.length === 0) return rawSegments;
    const segments = [...rawSegments].sort((a, b) => (a.start || 0) - (b.start || 0));
    const spoken = segments.filter(s => s && s.speaker !== 'silence');
    const speakerSet = new Set(spoken.map(s => s.speaker));
    if (speakerSet.size >= 2) return segments; // ya hay 2

    // Si no hay texto hablado o hay 1 solo segmento, no forzar
    if (spoken.length <= 1) return segments;

    const present: 'agent' | 'client' = (spoken[0]?.speaker === 'client') ? 'client' : 'agent';
    const opposite = (present === 'agent') ? 'client' : 'agent';
    const ackWords = ['sí','no','ok','okay','bueno','gracias','perfecto','está bien','de acuerdo','claro'];

    let flips = 0;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (!seg || seg.speaker === 'silence') continue;
      if (seg.explicit) continue; // nunca modificar segmentos con rol explícito
      const text: string = String(seg.text || '').toLowerCase();
      const hasQuestion = text.includes('¿') || text.endsWith('?');
      if (hasQuestion) {
        // Busca la respuesta siguiente corta dentro de 15s
        for (let j = i + 1; j < segments.length; j++) {
          const next = segments[j];
          if (!next || next.speaker === 'silence') continue;
          if (next.explicit) break; // si la respuesta tiene rol explícito, no tocar
          const gap = (next.start || 0) - (seg.end || seg.start || 0);
          const words = String(next.text || '').trim().split(/\s+/).filter(Boolean);
          const isShort = words.length <= 7;
          const isAck = ackWords.some(w => String(next.text || '').toLowerCase().includes(w));
          if (gap <= 15 && (isShort || isAck)) {
            // Sólo volteamos si todo hasta ahora es del mismo hablante detectado
            if (next.speaker === present) {
              next.speaker = opposite;
              flips++;
            }
            break;
          }
          // Si nos alejamos mucho en el tiempo, paramos la búsqueda
          if (gap > 20) break;
        }
      } else {
        // Respuestas muy cortas típicas de cliente → voltear si están marcadas como present
        const words = String(seg.text || '').trim().split(/\s+/).filter(Boolean);
        const isVeryShort = words.length <= 4 || ackWords.some(w => text.includes(w));
        if (isVeryShort && seg.speaker === present) {
          // Evita dos flips consecutivos para no crear alternancia artificial
          const prev = segments[i - 1];
          if (!prev || prev.speaker === present) {
            seg.speaker = opposite;
            flips++;
          }
        }
      }
      // Si ya hemos creado clara presencia de dos hablantes, podemos salir
      if (flips >= 2) break;
    }

    // Si aun así no logramos dos hablantes, respetar el único presente
    return segments;
  }

  function validateBehaviorsAnalysis(data: any[]): BehaviorAnalysis[] {
    if (!Array.isArray(data)) {
      console.error("Expected an array for behaviors_analysis, got:", typeof data);
      return [];
    }
    
    return data.filter(item => {
      const isValid = item && 
        typeof item === 'object' && 
        typeof item.name === 'string' && 
        (item.evaluation === 'cumple' || item.evaluation === 'no cumple') &&
        typeof item.comments === 'string';
        
      if (!isValid) {
        console.error("Invalid behavior item:", item);
      }
      
      return isValid;
    }).map(item => ({
      name: item.name,
      evaluation: item.evaluation as "cumple" | "no cumple",
      comments: item.comments
    }));
  }

  return {
    call,
    setCall,
    isLoading,
    transcriptSegments,
    error: loadError
  };
}

// Add the missing useCallChatMessages hook
export function useCallChatMessages(callId: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMessages = async () => {
    if (!callId) return { data: [] };
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('call_chat_messages')
        .select('*')
        .eq('call_id', callId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error fetching chat messages:', error);
        return { data: [] };
      }

      setMessages(data || []);
      return { data: data || [] };
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      return { data: [] };
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [callId]);

  return {
    data: messages,
    isLoading,
    refetch: fetchMessages
  };
}
