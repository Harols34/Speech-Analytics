import { useState, useEffect } from 'react';
import { ElevenLabsVoice } from '@/lib/types/training';
import { supabase } from '@/integrations/supabase/client';

const GLOBAL_VOICE_KEY = 'training_global_voice';

// Voz predeterminada de OpenAI (siempre disponible, no requiere API key de ElevenLabs)
const DEFAULT_VOICE: ElevenLabsVoice = {
  voice_id: 'nova',
  name: 'OP Nova',
  category: 'openai',
  description: 'Voz femenina energética y dinámica (predeterminada)',
  gender: 'femenino',
  age: 'joven',
  accent: 'neutral',
  language: 'multilingüe'
};

// Type guard to check if data is a valid ElevenLabsVoice
const isValidVoice = (data: any): data is ElevenLabsVoice => {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.voice_id === 'string' &&
    typeof data.name === 'string' &&
    typeof data.category === 'string'
  );
};

export function useGlobalVoice() {
  const [globalVoice, setGlobalVoice] = useState<ElevenLabsVoice | null>(null);
  const [ttsModel, setTtsModel] = useState<string>('tts-1'); // Default OpenAI model
  const [voiceSettings, setVoiceSettings] = useState({
    stability: 0.6,
    similarity_boost: 0.85,
    style: 0.3,
    use_speaker_boost: true
  });

  // Cargar voz guardada (DB primero, luego localStorage, si no hay nada usar predeterminada)
  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', GLOBAL_VOICE_KEY)
          .maybeSingle();

        if (!error && data?.value) {
          // Safe type conversion with validation
          if (isValidVoice(data.value)) {
            setGlobalVoice(data.value);
            return; // DB is source of truth
          }
        }
      } catch (e) {
        console.warn('No se pudo cargar voz global desde DB, usando localStorage');
      }

      const savedVoice = localStorage.getItem(GLOBAL_VOICE_KEY);
      if (savedVoice) {
        try {
          const voice = JSON.parse(savedVoice);
          if (isValidVoice(voice)) {
            setGlobalVoice(voice);
            return;
          }
        } catch (error) {
          console.error('Error loading saved voice:', error);
        }
      }

      // Si no hay voz guardada, usar la predeterminada (OpenAI Nova)
      console.log('No hay voz guardada, usando voz predeterminada:', DEFAULT_VOICE.name);
      setGlobalVoice(DEFAULT_VOICE);
    };
    load();
  }, []);

  // Cargar modelo TTS guardado
  useEffect(() => {
    const savedModel = localStorage.getItem('training_tts_model');
    if (savedModel) {
      setTtsModel(savedModel);
    }
  }, []);

  // Guardar voz seleccionada (DB para todos, local para fallback)
  const selectGlobalVoice = async (voice: ElevenLabsVoice) => {
    setGlobalVoice(voice);
    localStorage.setItem(GLOBAL_VOICE_KEY, JSON.stringify(voice));

    try {
      // Convert to JSON-safe format
      const voiceData = JSON.parse(JSON.stringify(voice));
      
      // Try update then insert
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('key', GLOBAL_VOICE_KEY)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('app_settings')
          .update({ value: voiceData })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('app_settings')
          .insert({ key: GLOBAL_VOICE_KEY, value: voiceData });
      }
    } catch (e) {
      console.warn('No se pudo guardar voz global en DB (¿permisos?); usando localStorage', e);
    }
  };

  const clearGlobalVoice = () => {
    setGlobalVoice(null);
    localStorage.removeItem(GLOBAL_VOICE_KEY);
  };

  const updateVoiceSettings = (newSettings: Partial<typeof voiceSettings>) => {
    setVoiceSettings(prev => ({ ...prev, ...newSettings }));
  };

  const updateTtsModel = (model: string) => {
    setTtsModel(model);
    localStorage.setItem('training_tts_model', model);
  };

  return {
    globalVoice,
    voiceSettings,
    ttsModel,
    selectGlobalVoice,
    clearGlobalVoice,
    updateVoiceSettings,
    updateTtsModel
  };
}
