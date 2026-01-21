import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ElevenLabsVoice } from '@/lib/types/training';
import { toast } from 'sonner';

// OpenAI TTS voices - Todas las voces disponibles con modelo tts-1 (rápido y económico)
const OPENAI_VOICES: ElevenLabsVoice[] = [
  {
    voice_id: 'alloy',
    name: 'OP Alloy',
    category: 'openai',
    description: 'Voz neutral y versátil, ideal para contenido general',
    gender: 'neutral',
    age: 'adulto',
    accent: 'neutral',
    language: 'multilingüe'
  },
  {
    voice_id: 'echo',
    name: 'OP Echo',
    category: 'openai',
    description: 'Voz masculina cálida y amigable',
    gender: 'masculino',
    age: 'adulto',
    accent: 'neutral',
    language: 'multilingüe'
  },
  {
    voice_id: 'fable',
    name: 'OP Fable',
    category: 'openai',
    description: 'Voz masculina expresiva con acento británico',
    gender: 'masculino',
    age: 'adulto',
    accent: 'británico',
    language: 'multilingüe'
  },
  {
    voice_id: 'onyx',
    name: 'OP Onyx',
    category: 'openai',
    description: 'Voz masculina profunda y autoritaria',
    gender: 'masculino',
    age: 'adulto',
    accent: 'neutral',
    language: 'multilingüe'
  },
  {
    voice_id: 'nova',
    name: 'OP Nova',
    category: 'openai',
    description: 'Voz femenina energética y dinámica',
    gender: 'femenino',
    age: 'joven',
    accent: 'neutral',
    language: 'multilingüe'
  },
  {
    voice_id: 'shimmer',
    name: 'OP Shimmer',
    category: 'openai',
    description: 'Voz femenina suave y profesional',
    gender: 'femenino',
    age: 'adulto',
    accent: 'neutral',
    language: 'multilingüe'
  },
  {
    voice_id: 'ash',
    name: 'OP Ash',
    category: 'openai',
    description: 'Voz masculina natural y conversacional',
    gender: 'masculino',
    age: 'adulto',
    accent: 'neutral',
    language: 'multilingüe'
  },
  {
    voice_id: 'ballad',
    name: 'OP Ballad',
    category: 'openai',
    description: 'Voz masculina narrativa y expresiva',
    gender: 'masculino',
    age: 'adulto',
    accent: 'neutral',
    language: 'multilingüe'
  },
  {
    voice_id: 'coral',
    name: 'OP Coral',
    category: 'openai',
    description: 'Voz femenina clara y articulada',
    gender: 'femenino',
    age: 'adulto',
    accent: 'neutral',
    language: 'multilingüe'
  },
  {
    voice_id: 'sage',
    name: 'OP Sage',
    category: 'openai',
    description: 'Voz masculina madura y tranquila',
    gender: 'masculino',
    age: 'adulto',
    accent: 'neutral',
    language: 'multilingüe'
  },
  {
    voice_id: 'verse',
    name: 'OP Verse',
    category: 'openai',
    description: 'Voz femenina versátil y melodiosa',
    gender: 'femenino',
    age: 'adulto',
    accent: 'neutral',
    language: 'multilingüe'
  }
];

export function useTrainingVoices() {
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-elevenlabs-voices');
      
      if (error) {
        console.error('Error fetching training voices:', error);
        toast.error('Error al cargar las voces de entrenamiento');
        return;
      }

      // Combine ElevenLabs voices with OpenAI voices
      const elevenLabsVoices = data?.voices || [];
      const allVoices = [...OPENAI_VOICES, ...elevenLabsVoices];
      setVoices(allVoices);
      
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al conectar con el servicio de voces');
    } finally {
      setLoading(false);
    }
  };

  const testTrainingVoice = async (voiceId: string, text: string, settings?: any, model?: string) => {
    try {
      console.log('Testing training voice:', { voiceId, text: text.substring(0, 50), model });
      
      // Determine if it's an OpenAI voice
      const openAIVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer', 'ash', 'ballad', 'coral', 'sage', 'verse'];
      const isOpenAI = openAIVoices.includes(voiceId);
      
      const endpoint = isOpenAI 
        ? 'openai-training-tts'
        : 'training-text-to-speech';
      
      const requestBody = isOpenAI 
        ? { text, voice: voiceId, speed: 1.0, model: model || 'tts-1' }
        : {
            text,
            voice_id: voiceId,
            voice_settings: settings || null,
            model: model || 'eleven_turbo_v2_5'
          };
      
      // Get session for auth
      const { data: { session } } = await supabase.auth.getSession();
      
      // Use fetch directly to get binary audio data
      const response = await fetch(
        `https://ejzidvltowbhccxukllc.supabase.co/functions/v1/${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        console.error('Training voice test error:', errorData);
        const errorMsg = errorData.error || errorData.message || 'Error al probar la voz';
        
        // Provide specific feedback for common errors
        if (errorMsg.includes('unusual activity') || errorMsg.includes('Free Tier')) {
          toast.error('ElevenLabs bloqueado por actividad inusual. Usa voces OpenAI (OP Nova, OP Alloy, etc) que siempre funcionan.', { duration: 6000 });
        } else if (errorMsg.includes('not configured')) {
          toast.error('API key no configurada. Contacta al administrador.');
        } else if (response.status === 401) {
          toast.error('API key de ElevenLabs inválida. Usa voces OpenAI (OP) o contacta al administrador.', { duration: 5000 });
        } else {
          toast.error(errorMsg);
        }
        return null;
      }

      // Get audio blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      toast.success('Voz cargada correctamente');
      return audioUrl;

    } catch (error) {
      console.error('Error testing training voice:', error);
      toast.error('Error de conexión al probar la voz');
      return null;
    }
  };

  const generateTrainingAudio = async (text: string, voiceId: string, settings?: any, sessionId?: string, scenarioId?: string, model?: string): Promise<Blob> => {
    const startTime = performance.now();
    
    try {
      console.log('🎙️ Generating training audio:', { voiceId, sessionId, scenarioId, textLength: text?.length, model });
      
      // Determine if it's an OpenAI voice
      const openAIVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer', 'ash', 'ballad', 'coral', 'sage', 'verse'];
      const isOpenAI = openAIVoices.includes(voiceId);
      
      const endpoint = isOpenAI 
        ? 'openai-training-tts'
        : 'training-text-to-speech';
      
      const requestBody = isOpenAI 
        ? { text, voice: voiceId, speed: 1.0, model: model || 'tts-1' }
        : {
            text,
            voice_id: voiceId,
            voice_settings: settings || null,
            sessionId,
            scenarioId,
            model: model || 'eleven_turbo_v2_5'
          };
      
      // Get session for auth
      const { data: { session } } = await supabase.auth.getSession();
      
      // Use fetch directly to get binary audio data with streaming
      const response = await fetch(
        `https://ejzidvltowbhccxukllc.supabase.co/functions/v1/${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        console.error('❌ Training audio generation error:', response.status, errorData);
        const errorMsg = errorData.error || errorData.message || 'Error generando audio';
        
        // AUTOMATIC FALLBACK: If ElevenLabs fails OR any error on non-OpenAI, retry with OpenAI
        if (!isOpenAI) {
          console.warn('⚠️ ElevenLabs failed, retrying with OpenAI fallback voice (nova)...');
          toast.info('Cambiando a voz OpenAI...', { duration: 2000 });
          
          // Use the same model if it's OpenAI-compatible, otherwise default to tts-1
          const fallbackModel = model?.startsWith('tts-') || model?.startsWith('gpt-') ? model : 'tts-1';
          console.log(`🔄 Using fallback model: ${fallbackModel}`);
          
          // Recursive call with OpenAI fallback voice and preserve model selection
          return generateTrainingAudio(text, 'nova', settings, sessionId, scenarioId, fallbackModel);
        }
        
        // If OpenAI also fails, show error
        toast.error('Error al generar audio. Intenta de nuevo.', { duration: 3000 });
        throw new Error(errorMsg);
      }

      // Get audio blob from response
      const audioBlob = await response.blob();
      
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Audio vacío recibido del servidor');
      }
      
      const duration = performance.now() - startTime;
      console.log('✅ Audio generated successfully:', { 
        size: audioBlob.size, 
        type: audioBlob.type,
        provider: isOpenAI ? 'OpenAI' : 'ElevenLabs',
        durationMs: Math.round(duration)
      });
      
      return audioBlob;
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error('💥 Error generating training audio:', error, `(${Math.round(duration)}ms)`);
      
      // Last resort fallback to OpenAI nova
      const openAIVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer', 'ash', 'ballad', 'coral', 'sage', 'verse'];
      const isOpenAI = openAIVoices.includes(voiceId);
      
      if (!isOpenAI) {
        console.warn('🔄 Last resort: Trying OpenAI nova voice...');
        try {
          // Use the same model if it's OpenAI-compatible, otherwise default to tts-1
          const fallbackModel = model?.startsWith('tts-') || model?.startsWith('gpt-') ? model : 'tts-1';
          console.log(`🔄 Using fallback model: ${fallbackModel}`);
          return await generateTrainingAudio(text, 'nova', settings, sessionId, scenarioId, fallbackModel);
        } catch (fallbackError) {
          console.error('💥 Even fallback failed:', fallbackError);
        }
      }
      
      throw error;
    }
  };

  useEffect(() => {
    fetchVoices();
  }, []);

  return {
    voices,
    loading,
    refetch: fetchVoices,
    testTrainingVoice,
    generateTrainingAudio
  };
}